"""Global rate limiting middleware"""
import time
from typing import Callable
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import status
from app.infra.cache.redis_client import r

class GlobalRateLimitMiddleware:
    """Global rate limiting middleware for all requests"""
    def __init__(self, app, max_requests: int = 1000, window_seconds: int = 3600, enabled: bool = True):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.enabled = enabled

    async def __call__(self, request: Request, call_next: Callable):
        if not self.enabled:
            return await call_next(request)
        ip = self._get_client_ip(request)
        is_allowed, retry_after = self._check_rate_limit(ip)
        if not is_allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded"},
                headers={"Retry-After": str(retry_after)},
            )
        self._record_request(ip)
        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        return getattr(request.client, "host", "unknown")

    def _check_rate_limit(self, ip: str) -> tuple[bool, int]:
        try:
            key = f"global_rate_limit:{ip}"
            now = int(time.time())
            window_start = now - self.window_seconds
            pipe = r.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = pipe.execute()
            current = results[1]
            if current >= self.max_requests:
                return False, self.window_seconds
            return True, 0
        except Exception:
            return True, 0

    def _record_request(self, ip: str):
        try:
            key = f"global_rate_limit:{ip}"
            now = int(time.time())
            pipe = r.pipeline()
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, self.window_seconds)
            pipe.execute()
        except Exception:
            pass
