"""
Rate Limiting Module

This module provides Redis-based rate limiting using a sliding window algorithm.
Rate limiters prevent abuse by enforcing request limits over time windows.

Features:
    - Sliding window rate limiting with Redis sorted sets
    - Atomic pipeline operations for race-condition safety
    - Pre-configured limiters for common use cases (login, refresh, email)
    - Retry-After header calculation for 429 responses
    - Comprehensive error handling with graceful degradation
    - Detailed logging for rate limit violations

Algorithm:
    Uses Redis sorted sets (ZSET) with timestamps as scores to implement
    sliding window rate limiting. Old entries are automatically expired,
    and the count of recent entries determines if limit is exceeded.

Constants:
    DEFAULT_MAX_ATTEMPTS: Default maximum attempts allowed (5)
    DEFAULT_WINDOW_SECONDS: Default time window in seconds (300 = 5 minutes)
    MAX_IDENTIFIER_LENGTH: Maximum length for rate limit keys (256 characters)
    REDIS_KEY_TTL_MULTIPLIER: TTL multiplier for Redis keys (2x window)

Pre-configured Limiters:
    login_limiter: 5 attempts per 5 minutes
    refresh_limiter: 10 attempts per 5 minutes
    email_limiter: 3 attempts per 1 hour

Example:
    >>> from app.infra.security.rate_limiter import login_limiter
    >>> 
    >>> # Check if user can attempt login
    >>> allowed, retry_after = login_limiter.check_rate_limit("user@example.com")
    >>> if not allowed:
    ...     print(f"Rate limit exceeded. Retry after {retry_after} seconds")
    >>> else:
    ...     # Process login attempt
    ...     pass
"""

from __future__ import annotations
import logging
import time
from typing import Tuple
from redis import Redis
from redis.exceptions import RedisError, ConnectionError, TimeoutError

from ..cache.redis_client import r, redis_key

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class RateLimiterError(Exception):
    """Base exception for rate limiter operations"""
    pass

class RateLimiterValidationError(RateLimiterError):
    """Exception raised when rate limiter validation fails"""
    pass

class RateLimiterRedisError(RateLimiterError):
    """Exception raised when Redis operations fail"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# Default rate limit settings
DEFAULT_MAX_ATTEMPTS = 5
DEFAULT_WINDOW_SECONDS = 300  # 5 minutes

# Validation constraints
MAX_IDENTIFIER_LENGTH = 256
MIN_MAX_ATTEMPTS = 1
MAX_MAX_ATTEMPTS = 10000
MIN_WINDOW_SECONDS = 1
MAX_WINDOW_SECONDS = 86400  # 24 hours

# Redis key management
REDIS_KEY_TTL_MULTIPLIER = 2  # Keep keys for 2x window duration

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_identifier(identifier: str) -> None:
    """
    Validate rate limit identifier.
    
    Args:
        identifier: The identifier to validate (e.g., user ID, IP address)
        
    Raises:
        RateLimiterValidationError: If identifier is invalid
    """
    if not isinstance(identifier, str):
        raise RateLimiterValidationError(
            f"Identifier must be a string, got {type(identifier).__name__}"
        )
    
    if not identifier:
        raise RateLimiterValidationError("Identifier cannot be empty")
    
    if len(identifier) > MAX_IDENTIFIER_LENGTH:
        raise RateLimiterValidationError(
            f"Identifier too long ({len(identifier)} chars, max {MAX_IDENTIFIER_LENGTH})"
        )

def _validate_rate_limit_params(max_attempts: int, window_seconds: int) -> None:
    """
    Validate rate limit configuration parameters.
    
    Args:
        max_attempts: Maximum attempts allowed
        window_seconds: Time window in seconds
        
    Raises:
        RateLimiterValidationError: If parameters are invalid
    """
    if not isinstance(max_attempts, int):
        raise RateLimiterValidationError(
            f"max_attempts must be an integer, got {type(max_attempts).__name__}"
        )
    
    if max_attempts < MIN_MAX_ATTEMPTS or max_attempts > MAX_MAX_ATTEMPTS:
        raise RateLimiterValidationError(
            f"max_attempts must be between {MIN_MAX_ATTEMPTS} and {MAX_MAX_ATTEMPTS}, "
            f"got {max_attempts}"
        )
    
    if not isinstance(window_seconds, int):
        raise RateLimiterValidationError(
            f"window_seconds must be an integer, got {type(window_seconds).__name__}"
        )
    
    if window_seconds < MIN_WINDOW_SECONDS or window_seconds > MAX_WINDOW_SECONDS:
        raise RateLimiterValidationError(
            f"window_seconds must be between {MIN_WINDOW_SECONDS} and {MAX_WINDOW_SECONDS}, "
            f"got {window_seconds}"
        )

# ============================================================================
# Rate Limiter Class
# ============================================================================

class RateLimiter:
    """
    Redis-based rate limiter using sliding window algorithm.
    
    Attributes:
        key_prefix: Prefix for Redis keys (e.g., "rate_limit:login")
        max_attempts: Maximum attempts allowed within window
        window_seconds: Time window in seconds
        fail_closed: If True, deny requests when Redis is unavailable
                     (recommended for auth-critical limiters)
    """
    
    def __init__(
        self,
        key_prefix: str,
        max_attempts: int = DEFAULT_MAX_ATTEMPTS,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
        fail_closed: bool = False,
    ):
        """
        Initialize rate limiter with configuration.
        
        Args:
            key_prefix: Prefix for Redis keys (e.g., "rate_limit:login")
            max_attempts: Maximum attempts allowed within window.
                Defaults to DEFAULT_MAX_ATTEMPTS (5).
            window_seconds: Time window in seconds.
                Defaults to DEFAULT_WINDOW_SECONDS (300 = 5 minutes).
                
        Raises:
            RateLimiterValidationError: If parameters are invalid
        """
        # Validate parameters
        if not isinstance(key_prefix, str) or not key_prefix:
            raise RateLimiterValidationError(
                "key_prefix must be a non-empty string"
            )
        
        _validate_rate_limit_params(max_attempts, window_seconds)
        
        self.key_prefix = key_prefix
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.fail_closed = fail_closed
        
        logger.info(
            "Initialized rate limiter",
            extra={
                "key_prefix": key_prefix,
                "max_attempts": max_attempts,
                "window_seconds": window_seconds,
            }
        )
    
    def check_rate_limit(self, identifier: str) -> Tuple[bool, int]:
        """
        Check if identifier has exceeded rate limit.
        
        Uses Redis sorted set with timestamps as scores to implement sliding
        window rate limiting. Automatically removes expired entries and counts
        recent attempts within the time window.
        
        Args:
            identifier: Unique identifier to rate limit (e.g., user ID, IP address).
                Will be prefixed with key_prefix to form Redis key.
                
        Returns:
            Tuple of (allowed, retry_after):
                - allowed: True if request is allowed, False if rate limited
                - retry_after: Seconds to wait before retrying (0 if allowed)
                
        Raises:
            RateLimiterValidationError: If identifier is invalid
            
        Example:
            >>> limiter = RateLimiter("rate_limit:api", max_attempts=10, window_seconds=60)
            >>> allowed, retry_after = limiter.check_rate_limit("user_123")
            >>> if not allowed:
            ...     print(f"Rate limit exceeded. Retry after {retry_after}s")
            ... else:
            ...     # Process request
            ...     pass
            
        Notes:
            - Automatically cleans up expired entries
            - Thread-safe via Redis pipeline atomic operations
            - Returns (True, 0) on Redis errors (fail-open for availability)
            - Sets Redis key TTL to prevent memory leaks
        """
        try:
            # Validate identifier
            _validate_identifier(identifier)
            
            # Build Redis key
            key = redis_key(self.key_prefix, identifier)
            current_time = int(time.time())
            window_start = current_time - self.window_seconds
            
            logger.debug(
                "Checking rate limit",
                extra={
                    "identifier": identifier,
                    "key": key,
                    "max_attempts": self.max_attempts,
                    "window_seconds": self.window_seconds,
                    "current_time": current_time,
                    "window_start": window_start,
                }
            )
            
            # Use pipeline for atomic operations
            try:
                pipe = r.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                pipe.expire(key, self.window_seconds * REDIS_KEY_TTL_MULTIPLIER)
                results = pipe.execute()
                
                current_attempts = results[1]
                
                logger.debug(
                    "Retrieved current attempt count",
                    extra={
                        "identifier": identifier,
                        "key": key,
                        "current_attempts": current_attempts,
                        "max_attempts": self.max_attempts,
                    }
                )
                
            except (RedisError, ConnectionError, TimeoutError) as e:
                logger.error(
                    "Failed to check rate limit due to Redis error",
                    exc_info=True,
                    extra={
                        "identifier": identifier,
                        "key": key,
                        "error": str(e),
                        "fail_closed": self.fail_closed,
                    }
                )
                if self.fail_closed:
                    # Auth-critical: deny on Redis failure
                    return False, self.window_seconds
                # Non-critical: allow on Redis failure
                return True, 0
            
            # Check if rate limit exceeded
            if current_attempts >= self.max_attempts:
                # Calculate retry_after: time until oldest entry expires
                try:
                    oldest_entries = r.zrange(key, 0, 0, withscores=True)
                    if oldest_entries:
                        oldest_time = int(oldest_entries[0][1])
                        retry_after = max(0, self.window_seconds - (current_time - oldest_time))
                    else:
                        retry_after = self.window_seconds
                except (RedisError, ConnectionError, TimeoutError) as e:
                    logger.warning(
                        "Failed to calculate retry_after, using window duration",
                        extra={
                            "identifier": identifier,
                            "key": key,
                            "error": str(e),
                        }
                    )
                    retry_after = self.window_seconds
                
                logger.warning(
                    "Rate limit exceeded",
                    extra={
                        "identifier": identifier,
                        "key": key,
                        "current_attempts": current_attempts,
                        "max_attempts": self.max_attempts,
                        "window_seconds": self.window_seconds,
                        "retry_after": retry_after,
                    }
                )
                
                return False, retry_after
            
            # Add current timestamp to sorted set
            try:
                r.zadd(key, {str(current_time): current_time})
            except (RedisError, ConnectionError, TimeoutError) as e:
                logger.warning(
                    "Failed to record rate limit attempt",
                    extra={
                        "identifier": identifier,
                        "key": key,
                        "error": str(e),
                    }
                )
                # Continue even if recording fails (request already checked)
            
            # Rate limit not exceeded
            logger.debug(
                "Rate limit check passed",
                extra={
                    "identifier": identifier,
                    "key": key,
                    "current_attempts": current_attempts + 1,  # After adding
                    "max_attempts": self.max_attempts,
                    "remaining": self.max_attempts - current_attempts - 1,
                }
            )
            
            return True, 0
            
        except RateLimiterValidationError:
            # Re-raise validation errors
            raise
        except Exception as e:
            # Unexpected errors
            logger.error(
                "Rate limit check failed due to unexpected error",
                exc_info=True,
                extra={
                    "identifier": identifier,
                    "error": str(e),
                    "fail_closed": self.fail_closed,
                }
            )
            if self.fail_closed:
                return False, self.window_seconds
            return True, 0

# ============================================================================
# Pre-configured Rate Limiters
# ============================================================================

# Login attempts: 5 per 5 minutes (fail-closed - auth critical)
login_limiter = RateLimiter(
    key_prefix="rate_limit:login",
    max_attempts=5,
    window_seconds=300,
    fail_closed=True,
)

# Registration: 3 per 10 minutes per IP (fail-closed)
registration_limiter = RateLimiter(
    key_prefix="rate_limit:register",
    max_attempts=3,
    window_seconds=600,
    fail_closed=True,
)

# Password reset request: 3 per 15 minutes per IP (fail-closed)
password_reset_limiter = RateLimiter(
    key_prefix="rate_limit:password_reset",
    max_attempts=3,
    window_seconds=900,
    fail_closed=True,
)

# Token refresh: 10 per 5 minutes (fail-open - availability matters more)
refresh_limiter = RateLimiter(
    key_prefix="rate_limit:refresh",
    max_attempts=10,
    window_seconds=300,
    fail_closed=False,
)

# Email sending: 3 per hour (fail-closed - prevents spam)
email_limiter = RateLimiter(
    key_prefix="rate_limit:email",
    max_attempts=3,
    window_seconds=3600,
    fail_closed=True,
)

# 2FA OTP verification: 5 per 5 minutes (fail-closed - prevents brute-force)
otp_limiter = RateLimiter(
    key_prefix="rate_limit:otp",
    max_attempts=5,
    window_seconds=300,
    fail_closed=True,
)

# Feedback submission: 5 per 15 minutes per IP (fail-closed - prevents spam)
feedback_limiter = RateLimiter(
    key_prefix="rate_limit:feedback",
    max_attempts=5,
    window_seconds=900,
    fail_closed=True,
)

# AI / LLM endpoints: 20 per hour per user (fail-closed - prevents cost overrun)
ai_limiter = RateLimiter(
    key_prefix="rate_limit:ai",
    max_attempts=20,
    window_seconds=3600,
    fail_closed=True,
)

# Document analysis: 15 per hour per user (fail-closed - LLM cost control)
analysis_limiter = RateLimiter(
    key_prefix="rate_limit:analysis",
    max_attempts=15,
    window_seconds=3600,
    fail_closed=True,
)
