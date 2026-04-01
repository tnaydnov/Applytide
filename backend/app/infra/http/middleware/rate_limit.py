"""
Enhanced Global Rate Limiting Middleware

This module implements production-grade rate limiting with sliding window algorithm
and atomic Redis operations via Lua scripting for high-performance request throttling.

Features:
    - Sliding window rate limiting (more accurate than fixed window)
    - Atomic Redis operations via Lua script (prevents race conditions)
    - Configurable identification (IP-based or user-based)
    - Path-based exemptions (health checks, docs, static assets)
    - Standard HTTP headers (X-RateLimit-Limit, Remaining, Reset, Retry-After)
    - Fail-open design (allows requests if Redis unavailable)
    - Async/non-blocking implementation
    - CORS preflight exemption
    - Lazy Lua script loading (avoids blocking startup)

Rate Limiting Algorithm:
    Uses Redis Sorted Sets (ZSET) with timestamps as scores:
    1. Remove expired entries (outside sliding window)
    2. Check if current count >= limit
    3. If exceeded: Return 429 with Retry-After header
    4. If allowed: Add new timestamp, return remaining quota
    
    Window slides continuously (not fixed buckets), providing:
    - Smoother rate limiting behavior
    - No burst allowance at window boundaries
    - More accurate request counting

Configuration Constants:
    DEFAULT_MAX_REQUESTS: 1000 (requests per window)
    DEFAULT_WINDOW_SECONDS: 3600 (1 hour sliding window)
    DEFAULT_KEY_PREFIX: "grl" (Redis key prefix)
    MIN_RETRY_AFTER: 1 (minimum retry-after seconds)
    REDIS_SCRIPT_TIMEOUT: 5.0 (Lua script execution timeout)
    MAX_IDENTIFIER_LENGTH: 256 (max length for user_id/ip)

Identification Modes:
    - "ip": Rate limit by client IP address (default)
    - "user_or_ip": Rate limit by authenticated user_id, fallback to IP

Exempt Paths (Default):
    - /health (health checks)
    - /docs, /redoc, /openapi.json (API documentation)
    - OPTIONS requests (CORS preflight)

Usage:
    from app.infra.http.middleware.rate_limit import GlobalRateLimitMiddleware
    
    app.add_middleware(
        GlobalRateLimitMiddleware,
        max_requests=100,
        window_seconds=60,
        identify_by="user_or_ip",
        exempt_paths={"/health", "/metrics"}
    )

HTTP Headers:
    Response headers on all requests:
    - X-RateLimit-Limit: Maximum requests allowed in window
    - X-RateLimit-Remaining: Remaining requests in current window
    - X-RateLimit-Reset: Unix timestamp when quota resets
    
    Additional on 429 response:
    - Retry-After: Seconds until next request allowed

Security Notes:
    - Lua script runs atomically in Redis (prevents race conditions)
    - Fail-open on Redis errors (availability over strict limiting)
    - IP extraction considers X-Forwarded-For, X-Real-IP headers
    - Rate limit keys include identifier type prefix (ip: or user:)
    - Random member IDs prevent ZSET key collisions

Performance:
    - Lazy Lua script loading (first request only)
    - Script SHA caching (reduces network overhead)
    - Automatic script reload on cache flush
    - Non-blocking async operations
    - O(log N) Redis operations per request

Example Rate Limit Response:
    HTTP/1.1 429 Too Many Requests
    Retry-After: 45
    X-RateLimit-Limit: 1000
    X-RateLimit-Remaining: 0
    X-RateLimit-Reset: 1730304000
    
    {
        "detail": "Rate limit exceeded"
    }
"""
from __future__ import annotations
import time
import asyncio
from typing import Iterable, Optional, Set, Tuple
from starlette.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send
from fastapi import status

from redis.asyncio import Redis
from redis.exceptions import RedisError, TimeoutError as RedisTimeoutError
from ....config import settings
from ...logging import get_logger
from ...cache.redis_client import redis_key as _redis_key


# Initialize logger
logger = get_logger(__name__)


# ===== CONFIGURATION CONSTANTS =====

# Rate limiting defaults
DEFAULT_MAX_REQUESTS = 1000  # Requests allowed per window
DEFAULT_WINDOW_SECONDS = 3600  # 1 hour sliding window
DEFAULT_KEY_PREFIX = "grl"  # Redis key prefix (Global Rate Limit)

# Timing constraints
MIN_RETRY_AFTER = 1  # Minimum seconds for Retry-After header
REDIS_SCRIPT_TIMEOUT = 5.0  # Lua script execution timeout (seconds)

# Validation limits
MAX_IDENTIFIER_LENGTH = 256  # Maximum length for user_id or IP string
MAX_WINDOW_SECONDS = 86400  # 24 hours (prevent indefinite windows)
MIN_WINDOW_SECONDS = 1  # Minimum 1 second window
MAX_REQUESTS_PER_WINDOW = 1000000  # Reasonable upper bound

# Redis key TTL margin (add extra time to prevent premature expiration)
KEY_TTL_MARGIN_SECONDS = 60  # Add 1 minute to window for safety


# ===== CUSTOM EXCEPTIONS =====

class RateLimitError(Exception):
    """Base exception for rate limiting errors"""
    pass


class RedisConnectionError(RateLimitError):
    """Raised when Redis connection fails"""
    pass


class LuaScriptError(RateLimitError):
    """Raised when Lua script execution fails"""
    pass


class ValidationError(RateLimitError):
    """Raised when configuration validation fails"""
    pass


class IdentifierExtractionError(RateLimitError):
    """Raised when client identifier cannot be extracted"""
    pass


# ===== VALIDATION FUNCTIONS =====

def _validate_max_requests(max_requests: int) -> None:
    """
    Validate max_requests configuration.
    
    Args:
        max_requests: Maximum requests per window
        
    Raises:
        ValidationError: If max_requests is invalid
    """
    if not isinstance(max_requests, int):
        raise ValidationError(f"max_requests must be integer, got {type(max_requests).__name__}")
    
    if max_requests < 1:
        raise ValidationError(f"max_requests must be >= 1, got {max_requests}")
    
    if max_requests > MAX_REQUESTS_PER_WINDOW:
        raise ValidationError(f"max_requests exceeds maximum of {MAX_REQUESTS_PER_WINDOW}")


def _validate_window_seconds(window_seconds: int) -> None:
    """
    Validate window_seconds configuration.
    
    Args:
        window_seconds: Time window in seconds
        
    Raises:
        ValidationError: If window_seconds is invalid
    """
    if not isinstance(window_seconds, int):
        raise ValidationError(f"window_seconds must be integer, got {type(window_seconds).__name__}")
    
    if window_seconds < MIN_WINDOW_SECONDS:
        raise ValidationError(f"window_seconds must be >= {MIN_WINDOW_SECONDS}, got {window_seconds}")
    
    if window_seconds > MAX_WINDOW_SECONDS:
        raise ValidationError(f"window_seconds exceeds maximum of {MAX_WINDOW_SECONDS}")


def _validate_key_prefix(key_prefix: str) -> None:
    """
    Validate Redis key prefix.
    
    Args:
        key_prefix: Prefix for Redis keys
        
    Raises:
        ValidationError: If key_prefix is invalid
    """
    if not isinstance(key_prefix, str):
        raise ValidationError(f"key_prefix must be string, got {type(key_prefix).__name__}")
    
    if not key_prefix:
        raise ValidationError("key_prefix cannot be empty")
    
    if len(key_prefix) > 50:
        raise ValidationError(f"key_prefix too long (max 50 chars), got {len(key_prefix)}")
    
    # Ensure no special Redis characters that could cause issues
    invalid_chars = {':', '*', '?', '[', ']', ' ', '\n', '\r', '\t'}
    if any(char in key_prefix for char in invalid_chars):
        raise ValidationError(f"key_prefix contains invalid characters: {invalid_chars}")


def _validate_identifier(identifier: str) -> None:
    """
    Validate client identifier (user_id or IP).
    
    Args:
        identifier: Client identifier string
        
    Raises:
        ValidationError: If identifier is invalid
    """
    if not isinstance(identifier, str):
        raise ValidationError(f"identifier must be string, got {type(identifier).__name__}")
    
    if not identifier:
        raise ValidationError("identifier cannot be empty")
    
    if len(identifier) > MAX_IDENTIFIER_LENGTH:
        raise ValidationError(f"identifier too long (max {MAX_IDENTIFIER_LENGTH} chars)")


def _validate_identify_by(identify_by: str) -> None:
    """
    Validate identify_by mode.
    
    Args:
        identify_by: Identification mode ("ip" or "user_or_ip")
        
    Raises:
        ValidationError: If identify_by is invalid
    """
    valid_modes = {"ip", "user_or_ip"}
    
    if not isinstance(identify_by, str):
        raise ValidationError(f"identify_by must be string, got {type(identify_by).__name__}")
    
    if identify_by not in valid_modes:
        raise ValidationError(f"identify_by must be one of {valid_modes}, got '{identify_by}'")


# ===== LUA SCRIPT =====

# Atomic sliding window rate limiting script
# Returns: {allowed, limit, remaining, retry_after, reset_at}
# - allowed: 1 if request allowed, 0 if rate limited
# - limit: Maximum requests in window
# - remaining: Requests remaining in current window
# - retry_after: Seconds until request allowed (0 if allowed)
# - reset_at: Unix timestamp when quota resets
RATE_LIMIT_LUA = """
local key     = KEYS[1]
local now     = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])

-- Remove expired entries (outside sliding window)
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)

-- Check if rate limit exceeded
if count >= limit then
  -- Calculate retry-after based on oldest timestamp in window
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldest_score = tonumber(oldest[2] or now)
  local retry_after = window - (now - oldest_score)
  
  -- Ensure minimum retry-after of 1 second
  if retry_after < 1 then 
    retry_after = 1 
  end
  
  local reset_at = now + retry_after
  
  -- Return: not allowed, limit, 0 remaining, retry_after, reset_at
  return {0, limit, 0, retry_after, reset_at}
end

-- Record this request hit with unique member
-- Format: "timestamp:random" to prevent collisions
local member = tostring(now) .. ':' .. tostring(math.random(1000000))
redis.call('ZADD', key, now, member)

-- Set expiration to window + margin (prevent premature deletion)
local ttl = window + 60
redis.call('EXPIRE', key, ttl)

-- Calculate remaining quota
local new_count = redis.call('ZCARD', key)
local remaining = limit - new_count
local reset_at = now + window

-- Return: allowed, limit, remaining, 0 retry_after, reset_at
return {1, limit, remaining, 0, reset_at}
"""


# ===== HELPER FUNCTIONS =====

def _split_list_env(value: str | None) -> list[str]:
    """
    Parse comma-separated environment variable into list.
    
    Args:
        value: Comma-separated string
        
    Returns:
        List of trimmed non-empty strings
        
    Example:
        >>> _split_list_env("path1, path2,  path3")
        ['path1', 'path2', 'path3']
    """
    if not value:
        return []
    return [x.strip() for x in value.split(",") if x.strip()]


def _sanitize_ip(ip: str) -> str:
    """
    Sanitize and validate IP address.
    
    Args:
        ip: IP address string
        
    Returns:
        Sanitized IP address
        
    Notes:
        - Trims whitespace
        - Handles IPv4 and IPv6
        - Returns "unknown" for invalid IPs
    """
    if not ip:
        return "unknown"
    
    ip = ip.strip()
    
    # Basic validation (more comprehensive validation could be added)
    if not ip or ip == "unknown":
        return "unknown"
    
    # Truncate if too long (prevent abuse)
    if len(ip) > MAX_IDENTIFIER_LENGTH:
        logger.warning(
            "IP address too long, truncating",
            extra={"ip_length": len(ip)}
        )
        return ip[:MAX_IDENTIFIER_LENGTH]
    
    return ip



# ===== MIDDLEWARE CLASS =====

class GlobalRateLimitMiddleware:
    """
    ASGI middleware for global sliding-window rate limiting with atomic Redis operations.
    
    Features:
        - Sliding window algorithm (more accurate than fixed windows)
        - Atomic Lua script execution (prevents race conditions)
        - Configurable identification (IP or user-based)
        - Path exemptions (health checks, docs, etc.)
        - Standard rate limit headers (RFC 6585)
        - Fail-open design (allows requests on Redis errors)
        - Async/non-blocking implementation
        
    Attributes:
        app: ASGI application to wrap
        max_requests: Maximum requests allowed per window
        window_seconds: Time window in seconds (sliding)
        enabled: Whether rate limiting is active
        key_prefix: Redis key prefix for namespacing
        identify_by: Identification mode ("ip" or "user_or_ip")
        exempt_paths: Set of paths exempt from rate limiting
        redis: Redis async client
        
    Example:
        app.add_middleware(
            GlobalRateLimitMiddleware,
            max_requests=100,
            window_seconds=60,
            identify_by="user_or_ip"
        )
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        max_requests: int = DEFAULT_MAX_REQUESTS,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
        enabled: bool = True,
        redis: Optional[Redis] = None,
        key_prefix: str = DEFAULT_KEY_PREFIX,
        exempt_paths: Optional[Iterable[str]] = None,
        identify_by: str = "ip",
    ) -> None:
        """
        Initialize rate limiting middleware.
        
        Args:
            app: ASGI application
            max_requests: Maximum requests per window (default: 1000)
            window_seconds: Time window in seconds (default: 3600)
            enabled: Enable/disable rate limiting (default: True)
            redis: Redis client instance (default: create from settings)
            key_prefix: Redis key prefix (default: "grl")
            exempt_paths: Paths to exempt from rate limiting
            identify_by: Identification mode - "ip" or "user_or_ip" (default: "ip")
            
        Raises:
            ValidationError: If configuration is invalid
            RedisConnectionError: If Redis connection fails during init
        """
        self.app = app
        
        # Validate and set configuration
        try:
            _validate_max_requests(max_requests)
            _validate_window_seconds(window_seconds)
            _validate_key_prefix(key_prefix)
            _validate_identify_by(identify_by)
        except ValidationError as e:
            logger.error(
                "Rate limit middleware configuration error",
                extra={"error": str(e)},
                exc_info=True
            )
            raise
        
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.enabled = enabled
        self.key_prefix = key_prefix
        self.identify_by = identify_by
        
        # Set up exempt paths with defaults
        default_exempt = {
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        }
        self.exempt_paths: Set[str] = set(exempt_paths or default_exempt)
        
        # Initialize Redis connection
        try:
            self.redis = redis or Redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=REDIS_SCRIPT_TIMEOUT,
                socket_connect_timeout=REDIS_SCRIPT_TIMEOUT
            )
        except Exception as e:
            logger.error(
                "Failed to initialize Redis for rate limiting",
                extra={"error": str(e)},
                exc_info=True
            )
            raise RedisConnectionError(f"Redis initialization failed: {str(e)}")
        
        # Lua script SHA cache (loaded lazily on first request)
        self._lua_sha: Optional[str] = None
        self._script_lock = asyncio.Lock()
        
        logger.info(
            "Rate limiting middleware initialized",
            extra={
                "max_requests": max_requests,
                "window_seconds": window_seconds,
                "enabled": enabled,
                "identify_by": identify_by,
                "exempt_paths_count": len(self.exempt_paths)
            }
        )

    async def _ensure_script(self) -> None:
        """
        Ensure Lua script is loaded into Redis.
        
        Lazily loads script on first request to avoid blocking startup.
        Uses lock to prevent multiple concurrent loads.
        
        Raises:
            LuaScriptError: If script loading fails
        """
        if self._lua_sha:
            return
        
        async with self._script_lock:
            if self._lua_sha:
                return  # Another request already loaded it
            
            try:
                self._lua_sha = await self.redis.script_load(RATE_LIMIT_LUA)
                logger.info(
                    "Rate limit Lua script loaded",
                    extra={"script_sha": self._lua_sha}
                )
            except (RedisError, RedisTimeoutError) as e:
                logger.error(
                    "Failed to load rate limit Lua script",
                    extra={"error": str(e)},
                    exc_info=True
                )
                raise LuaScriptError(f"Lua script load failed: {str(e)}")

    def _is_exempt(self, scope: Scope) -> bool:
        """
        Check if request is exempt from rate limiting.
        
        Args:
            scope: ASGI scope
            
        Returns:
            True if request should be exempt
            
        Notes:
            Exempt conditions:
            - Non-HTTP requests (websockets, etc.)
            - Paths in exempt_paths set
            - OPTIONS requests (CORS preflight)
        """
        if scope["type"] != "http":
            return True  # Skip websockets/other protocols
        
        path = scope.get("path", "")
        if path in self.exempt_paths:
            logger.debug(
                "Request exempt from rate limiting",
                extra={"path": path, "reason": "exempt_path"}
            )
            return True
        
        # CORS preflight requests
        method = scope.get("method", "").upper()
        if method == "OPTIONS":
            logger.debug(
                "Request exempt from rate limiting",
                extra={"path": path, "reason": "cors_preflight"}
            )
            return True
        
        return False

    def _get_client_ip(self, scope: Scope) -> str:
        """
        Extract client IP address from request.
        
        Args:
            scope: ASGI scope
            
        Returns:
            Client IP address string
            
        Notes:
            Checks headers in order:
            1. X-Forwarded-For (first IP if multiple)
            2. X-Real-IP
            3. Direct client connection
            
        Raises:
            IdentifierExtractionError: If IP cannot be extracted
        """
        try:
            headers = dict(
                (k.decode().lower(), v.decode())
                for k, v in scope.get("headers", [])
            )
            
            # Check X-Forwarded-For (may have multiple IPs)
            xff = headers.get("x-forwarded-for")
            if xff:
                ip = xff.split(",")[0].strip()
                return _sanitize_ip(ip)
            
            # Check X-Real-IP
            real_ip = headers.get("x-real-ip")
            if real_ip:
                return _sanitize_ip(real_ip.strip())
            
            # Fall back to direct client
            client = scope.get("client")
            if client and len(client) > 0:
                return _sanitize_ip(client[0])
            
            # No IP found - return unknown
            logger.warning(
                "Could not extract client IP",
                extra={"headers": list(headers.keys())}
            )
            return "unknown"
            
        except Exception as e:
            logger.error(
                "Error extracting client IP",
                extra={"error": str(e)},
                exc_info=True
            )
            raise IdentifierExtractionError(f"Failed to extract IP: {str(e)}")

    def _identifier(self, scope: Scope) -> str:
        """
        Generate rate limit identifier for request.
        
        Args:
            scope: ASGI scope
            
        Returns:
            Identifier string (prefixed with "ip:" or "user:")
            
        Raises:
            IdentifierExtractionError: If identifier cannot be generated
            ValidationError: If identifier is invalid
        """
        try:
            if self.identify_by == "user_or_ip":
                # Check for authenticated user (set by auth middleware)
                state = scope.setdefault("state", {})
                user_id = state.get("user_id")
                
                if user_id:
                    user_id_str = str(user_id)
                    _validate_identifier(user_id_str)
                    
                    logger.debug(
                        "Using user-based rate limiting",
                        extra={"user_id": user_id_str}
                    )
                    return f"user:{user_id_str}"
            
            # Fall back to IP-based limiting
            client_ip = self._get_client_ip(scope)
            _validate_identifier(client_ip)
            
            logger.debug(
                "Using IP-based rate limiting",
                extra={"client_ip": client_ip}
            )
            return f"ip:{client_ip}"
            
        except (IdentifierExtractionError, ValidationError) as e:
            logger.error(
                "Failed to generate rate limit identifier",
                extra={"error": str(e)},
                exc_info=True
            )
            raise

            raise

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        Process request and apply rate limiting.
        
        Args:
            scope: ASGI scope
            receive: ASGI receive callable
            send: ASGI send callable
            
        Notes:
            - Checks if request is exempt
            - Executes Lua script atomically in Redis
            - Returns 429 if rate limit exceeded
            - Adds rate limit headers to response
            - Fails open on Redis errors (allows request)
            
        Raises:
            Does not raise - fails open on errors to maintain availability
        """
        # Skip if disabled or exempt
        if not self.enabled or self._is_exempt(scope):
            await self.app(scope, receive, send)
            return

        now = int(time.time())
        
        # Get client identifier
        try:
            ident = self._identifier(scope)
        except (IdentifierExtractionError, ValidationError) as e:
            logger.warning(
                "Failed to identify client, allowing request",
                extra={"error": str(e)}
            )
            await self.app(scope, receive, send)
            return
        
        key = _redis_key(self.key_prefix, ident)
        
        # Execute rate limiting check
        try:
            await self._ensure_script()
            
            # Try to use cached script SHA
            try:
                result = await self.redis.evalsha(
                    self._lua_sha,
                    1,  # Number of keys
                    key,
                    now,
                    self.window_seconds,
                    self.max_requests
                )
            except RedisError as e:
                # Script cache may have been flushed - reload and retry
                logger.warning(
                    "Lua script SHA not found, reloading",
                    extra={"error": str(e)}
                )
                self._lua_sha = None
                await self._ensure_script()
                
                # Retry with direct EVAL
                result = await self.redis.eval(
                    RATE_LIMIT_LUA,
                    1,
                    key,
                    now,
                    self.window_seconds,
                    self.max_requests
                )
            
            # Parse Lua script result
            allowed, limit, remaining, retry_after, reset_at = result
            allowed = int(allowed)
            limit = int(limit)
            remaining = int(remaining)
            retry_after = int(retry_after)
            reset_at = int(reset_at)
            
        except (RedisError, RedisTimeoutError, LuaScriptError) as e:
            # Redis error - fail open (allow request)
            logger.error(
                "Rate limit check failed, allowing request (fail-open)",
                extra={
                    "error": str(e),
                    "identifier": ident,
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            await self.app(scope, receive, send)
            return
        except Exception as e:
            # Unexpected error - fail open
            logger.error(
                "Unexpected rate limiting error, allowing request",
                extra={"error": str(e), "identifier": ident},
                exc_info=True
            )
            await self.app(scope, receive, send)
            return

        # Check if rate limit exceeded
        if allowed == 0:
            # Build rate limit headers
            headers = {
                "Retry-After": str(max(retry_after, MIN_RETRY_AFTER)),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_at),
            }
            
            # Log rate limit exceeded
            logger.warning(
                "Rate limit exceeded",
                extra={
                    "identifier": ident,
                    "limit": limit,
                    "window_seconds": self.window_seconds,
                    "retry_after": retry_after,
                    "path": scope.get("path"),
                    "method": scope.get("method")
                }
            )
            
            # Return 429 response
            resp = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded",
                    "limit": limit,
                    "window": self.window_seconds,
                    "retry_after": retry_after
                },
                headers=headers,
            )
            await resp(scope, receive, send)
            return

        # Request allowed - pass through with rate limit headers
        logger.debug(
            "Request allowed",
            extra={
                "identifier": ident,
                "remaining": remaining,
                "limit": limit
            }
        )
        
        async def send_with_headers(message):
            """Add rate limit headers to response"""
            if message["type"] == "http.response.start":
                mh = MutableHeaders(raw=message.get("headers", []))
                mh.append("X-RateLimit-Limit", str(limit))
                mh.append("X-RateLimit-Remaining", str(remaining))
                mh.append("X-RateLimit-Reset", str(reset_at))
                message["headers"] = mh.raw
            await send(message)

        await self.app(scope, receive, send_with_headers)
