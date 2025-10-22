"""Global rate limiting middleware (async, sliding window, atomic via Lua)."""
from __future__ import annotations
import time, asyncio
from typing import Iterable, Optional, Set
from starlette.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send
from fastapi import status

from redis.asyncio import Redis
from ....config import settings
from ...logging import get_logger
# ADMIN CLEANUP: Removed security_tracking import
from ....db.session import get_db


# Initialize logger
logger = get_logger(__name__)

RATE_LIMIT_LUA = """
local key     = KEYS[1]
local now     = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])

-- drop old
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)
if count >= limit then
  -- compute retry-after based on oldest timestamp in window
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldest_score = tonumber(oldest[2] or now)
  local retry_after = window - (now - oldest_score)
  if retry_after < 1 then retry_after = 1 end
  local reset_at = now + retry_after
  return {0, limit, 0, retry_after, reset_at}
end

-- record this hit
local member = tostring(now) .. ':' .. tostring(math.random(1000000))
redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, window)

local new_count = redis.call('ZCARD', key)
local remaining = limit - new_count
local reset_at = now + window
return {1, limit, remaining, 0, reset_at}
"""

def _split_list_env(value: str | None) -> list[str]:
    if not value: return []
    return [x.strip() for x in value.split(",") if x.strip()]

class GlobalRateLimitMiddleware:
    """
    ASGI middleware applying a global sliding-window rate limit per identifier (IP by default).
    Adds:
      - X-RateLimit-Limit
      - X-RateLimit-Remaining
      - X-RateLimit-Reset   (unix seconds)
    Returns 429 with Retry-After when exceeded.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        max_requests: int = 1000,
        window_seconds: int = 3600,
        enabled: bool = True,
        redis: Optional[Redis] = None,
        key_prefix: str = "grl",
        exempt_paths: Optional[Iterable[str]] = None,
        identify_by: str = "ip",  # "ip" or "user_or_ip" (expects request.state.user_id)
    ) -> None:
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.enabled = enabled
        self.key_prefix = key_prefix
        self.identify_by = identify_by
        self.exempt_paths: Set[str] = set(exempt_paths or {
            "/health", "/docs", "/redoc", "/openapi.json",
        })

        self.redis = redis or Redis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )

        self._lua_sha: Optional[str] = None
        # Preload Lua script lazily (first request); avoids blocking startup.
        self._script_lock = asyncio.Lock()

    async def _ensure_script(self) -> None:
        if self._lua_sha:
            return
        async with self._script_lock:
            if not self._lua_sha:
                self._lua_sha = await self.redis.script_load(RATE_LIMIT_LUA)

    def _is_exempt(self, scope: Scope) -> bool:
        if scope["type"] != "http":
            return True  # skip websockets/other
        path = scope.get("path", "")
        if path in self.exempt_paths:
            return True
        # CORS preflight
        if scope.get("method", "").upper() == "OPTIONS":
            return True
        return False

    def _get_client_ip(self, scope: Scope) -> str:
        headers = dict((k.decode().lower(), v.decode()) for k, v in scope.get("headers", []))
        xff = headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        real_ip = headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _identifier(self, scope: Scope) -> str:
        if self.identify_by == "user_or_ip":
            # If an upstream auth dependency/middleware sets request.state.user_id,
            # we can use it here. Otherwise fallback to IP.
            user_id = scope.setdefault("state", {}).get("user_id")
            if user_id:
                return f"user:{user_id}"
        return f"ip:{self._get_client_ip(scope)}"

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not self.enabled or self._is_exempt(scope):
            await self.app(scope, receive, send)
            return

        now = int(time.time())
        ident = self._identifier(scope)
        key = f"{self.key_prefix}:{ident}"

        try:
            await self._ensure_script()
            try:
                allowed, limit, remaining, retry_after, reset_at = await self.redis.evalsha(
                    self._lua_sha, 1, key, now, self.window_seconds, self.max_requests
                )
            except Exception:
                # Fallback to direct EVAL if script cache was flushed
                allowed, limit, remaining, retry_after, reset_at = await self.redis.eval(
                    RATE_LIMIT_LUA, 1, key, now, self.window_seconds, self.max_requests
                )
        except Exception:
            # On Redis errors, fail-open but do not expose internals.
            await self.app(scope, receive, send)
            return

        if int(allowed) == 0:
            headers = {
                "Retry-After": str(int(retry_after)),
                "X-RateLimit-Limit": str(int(limit)),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(reset_at)),
            }
            
            # ADMIN CLEANUP: Removed security event database logging
            
            resp = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded"},
                headers=headers,
            )
            await resp(scope, receive, send)
            return

        # Pass through, but inject rate-limit headers on the way out
        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                mh = MutableHeaders(raw=message.get("headers", []))
                mh.append("X-RateLimit-Limit", str(int(limit)))
                mh.append("X-RateLimit-Remaining", str(int(remaining)))
                mh.append("X-RateLimit-Reset", str(int(reset_at)))
                message["headers"] = mh.raw
            await send(message)

        await self.app(scope, receive, send_with_headers)
