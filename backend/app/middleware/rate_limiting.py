"""Global rate limiting middleware"""
import time
from typing import Callable
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi import HTTPException, status
from ..services.redis_client import r


class GlobalRateLimitMiddleware:
    """Global rate limiting middleware for all requests"""
    
    def __init__(
        self, 
        app,
        max_requests: int = 1000,
        window_seconds: int = 3600,  # 1 hour
        enabled: bool = True
    ):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.enabled = enabled
    
    async def __call__(self, request: Request, call_next: Callable):
        if not self.enabled:
            return await call_next(request)
        
        # Get client IP
        ip = self._get_client_ip(request)
        
        # Check rate limit
        is_allowed, retry_after = self._check_rate_limit(ip)
        
        if not is_allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded"},
                headers={"Retry-After": str(retry_after)}
            )
        
        # Record this request
        self._record_request(ip)
        
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers"""
        # Check forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to client host
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"
    
    def _check_rate_limit(self, ip: str) -> tuple[bool, int]:
        """Check if IP is within rate limits"""
        try:
            key = f"global_rate_limit:{ip}"
            current_time = int(time.time())
            window_start = current_time - self.window_seconds
            
            # Clean old entries and count current requests
            pipe = r.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = pipe.execute()
            
            current_requests = results[1]
            
            if current_requests >= self.max_requests:
                return False, self.window_seconds
            
            return True, 0
            
        except Exception:
            # If Redis fails, allow the request
            return True, 0
    
    def _record_request(self, ip: str):
        """Record a request for rate limiting"""
        try:
            key = f"global_rate_limit:{ip}"
            current_time = int(time.time())
            
            pipe = r.pipeline()
            pipe.zadd(key, {str(current_time): current_time})
            pipe.expire(key, self.window_seconds)
            pipe.execute()
            
        except Exception:
            # If Redis fails, continue silently
            pass
