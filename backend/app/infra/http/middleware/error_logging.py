"""
Global error handling middleware with automatic database logging
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
import traceback
from typing import Callable, Optional
import uuid

from ....db.session import get_db
from ....infra.logging import get_logger
from ....infra.logging.error_tracking import log_error

logger = get_logger(__name__)


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and log all unhandled exceptions to database
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        try:
            response = await call_next(request)
            return response
        
        except Exception as e:
            # Get request context
            endpoint = str(request.url.path)
            method = request.method
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent", "")
            
            # Try to get user_id from request state (set by auth middleware)
            user_id = None
            if hasattr(request.state, "user_id"):
                user_id = request.state.user_id
            elif hasattr(request.state, "user"):
                user_id = getattr(request.state.user, "id", None)
            
            # Determine service from endpoint
            service = self._extract_service(endpoint)
            
            # Determine severity
            severity = self._determine_severity(e)
            
            # Determine status code
            status_code = getattr(e, "status_code", 500)
            
            # Log to standard logger
            logger.error(
                f"Unhandled exception in {method} {endpoint}",
                extra={
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "endpoint": endpoint,
                    "method": method,
                    "user_id": str(user_id) if user_id else None,
                    "ip_address": ip_address
                },
                exc_info=True
            )
            
            # Log to database
            try:
                # Get database session
                db_gen = get_db()
                db = next(db_gen)
                
                try:
                    log_error(
                        db=db,
                        error=e,
                        user_id=user_id,
                        endpoint=endpoint,
                        method=method,
                        status_code=status_code,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        service=service,
                        severity=severity
                    )
                finally:
                    db.close()
                    
            except Exception as log_err:
                logger.error(
                    "Failed to log error to database",
                    extra={"log_error": str(log_err)}
                )
            
            # Return error response
            return JSONResponse(
                status_code=status_code,
                content={
                    "detail": str(e) if status_code < 500 else "Internal server error",
                    "error_type": type(e).__name__
                }
            )
    
    def _extract_service(self, endpoint: str) -> Optional[str]:
        """Extract service name from endpoint path"""
        parts = endpoint.split('/')
        if len(parts) >= 3 and parts[1] == 'api':
            return parts[2]  # e.g., /api/auth/login -> 'auth'
        return None
    
    def _determine_severity(self, error: Exception) -> str:
        """Determine error severity based on exception type"""
        error_name = type(error).__name__
        
        # Critical errors
        critical_errors = [
            'DatabaseError', 'OperationalError', 'IntegrityError',
            'SystemError', 'MemoryError', 'OSError'
        ]
        if error_name in critical_errors:
            return 'critical'
        
        # Warnings (expected errors)
        warning_errors = [
            'HTTPException', 'ValidationError', 'RequestValidationError',
            'ValueError', 'KeyError'
        ]
        if error_name in warning_errors:
            # But if status code is 500+, it's still an error
            status_code = getattr(error, "status_code", 500)
            if status_code >= 500:
                return 'error'
            return 'warning'
        
        # Default to error
        return 'error'
