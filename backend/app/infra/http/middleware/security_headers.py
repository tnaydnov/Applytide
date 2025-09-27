from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
import os

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            csp_settings = {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                "style-src": ["'self'"],
                "img-src": ["'self'", "data:"],
                "font-src": ["'self'"],
                "connect-src": ["'self'", "https://api.applytide.com", "wss://api.applytide.com"],
                "frame-src": ["'self'"],
                "object-src": ["'none'"],
                "base-uri": ["'self'"],
            }
            csp = "; ".join(f"{k} {' '.join(v)}" for k, v in csp_settings.items())
            response.headers["Content-Security-Policy"] = csp
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        else:
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
            response.headers["X-Content-Type-Options"] = "nosniff"
        return response
