"""
HTTP Request/Response Logging Middleware

Logs all HTTP requests and responses with:
- Unique request ID for tracing
- User identification
- Request/response timing
- Status codes
- Request/response sizes
- Client information (IP, user agent)

Automatically sets context for all downstream logging.
"""

import time
import uuid
import logging
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.infra.logging import get_logger
from app.infra.logging.filters import set_request_context, clear_request_context


logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses
    
    Features:
    - Generates unique request_id for each request
    - Logs request start and completion
    - Tracks response time
    - Extracts user info from request state
    - Sets logging context for request lifetime
    - Logs slow requests as warnings
    - Logs errors as errors
    """
    
    def __init__(
        self,
        app: ASGIApp,
        slow_request_threshold: float = 1.0,  # seconds
        skip_paths: set = None
    ):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.skip_paths = skip_paths or {
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log it"""
        
        # Skip logging for certain paths
        if request.url.path in self.skip_paths:
            return await call_next(request)
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Extract client info
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Extract user info (set by auth middleware)
        user_id = None
        session_id = None
        if hasattr(request.state, "user_id"):
            user_id = str(request.state.user_id)
        if hasattr(request.state, "session_id"):
            session_id = request.state.session_id
        
        # Set logging context
        set_request_context(
            request_id=request_id,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            endpoint=request.url.path,
            method=request.method
        )
        
        # Log request start
        logger.info(
            f"{request.method} {request.url.path}",
            extra={
                "event": "request_started",
                "query_params": dict(request.query_params) if request.query_params else None,
                "content_length": request.headers.get("content-length"),
            }
        )
        
        # Process request and measure time
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Log response
            log_level = self._get_log_level(response.status_code, duration)
            log_extra = {
                "event": "request_completed",
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "response_size": response.headers.get("content-length"),
            }
            
            if response.status_code >= 400:
                logger.warning(
                    f"{request.method} {request.url.path} - {response.status_code}",
                    extra=log_extra
                )
            elif duration > self.slow_request_threshold:
                logger.warning(
                    f"Slow request: {request.method} {request.url.path} took {duration:.2f}s",
                    extra=log_extra
                )
            else:
                logger.info(
                    f"{request.method} {request.url.path} - {response.status_code}",
                    extra=log_extra
                )
            
            return response
            
        except Exception as exc:
            # Calculate duration
            duration = time.time() - start_time
            
            # Log exception
            logger.error(
                f"Request failed: {request.method} {request.url.path}",
                exc_info=True,
                extra={
                    "event": "request_failed",
                    "duration_ms": round(duration * 1000, 2),
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc),
                }
            )
            
            # Re-raise exception
            raise
            
        finally:
            # Clear logging context
            clear_request_context()
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        
        # Check X-Forwarded-For header (if behind proxy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Take first IP in list
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _get_log_level(self, status_code: int, duration: float) -> str:
        """Determine appropriate log level"""
        
        if status_code >= 500:
            return "error"
        elif status_code >= 400:
            return "warning"
        elif duration > self.slow_request_threshold:
            return "warning"
        else:
            return "info"


class ResponseLoggingMiddleware(BaseHTTPMiddleware):
    """
    Additional middleware for detailed response logging
    
    Can be enabled for debugging or disabled for production
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log response details"""
        
        response = await call_next(request)
        
        # Log response headers (for debugging)
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(
                "Response headers",
                extra={
                    "headers": dict(response.headers)
                }
            )
        
        return response
