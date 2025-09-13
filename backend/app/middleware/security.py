from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
import os

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Security headers for production
        if os.getenv("ENVIRONMENT") == "production":
            # Prevent clickjacking
            response.headers["X-Frame-Options"] = "DENY"
            
            # Prevent MIME type sniffing
            response.headers["X-Content-Type-Options"] = "nosniff"
            
            # XSS Protection
            response.headers["X-XSS-Protection"] = "1; mode=block"
            
            # Referrer Policy
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            # Content Security Policy - stricter for production
            csp_settings = {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                "style-src": ["'self'"],
                "img-src": ["'self'", "data:"],
                "font-src": ["'self'"],
                "connect-src": ["'self'", "https://api.applytide.com"],
                "frame-src": ["'self'"],
                "object-src": ["'none'"],
                "base-uri": ["'self'"]
            }
            
            # Only add unsafe-inline in development
            if os.getenv("ENVIRONMENT") != "production":
                csp_settings["script-src"].append("'unsafe-inline'")
                csp_settings["style-src"].append("'unsafe-inline'")
                
            # Build CSP string
            csp = "; ".join(f"{k} {' '.join(v)}" for k, v in csp_settings.items())
            response.headers["Content-Security-Policy"] = csp
            
            # HSTS (HTTP Strict Transport Security)
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
            # Permissions Policy
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        else:
            # Development headers - less strict
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
            response.headers["X-Content-Type-Options"] = "nosniff"
            
        return response
