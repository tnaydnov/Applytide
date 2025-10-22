"""
Global Exception Handler for FastAPI

Catches all unhandled exceptions and logs them with full context.
Returns user-friendly error responses.
Integrates with error tracking database.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from app.infra.logging import get_logger
from app.db.session import get_db


logger = get_logger(__name__)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handle HTTP exceptions (4xx, 5xx)
    
    Logs errors and returns formatted response
    """
    
    # Log based on severity
    if exc.status_code >= 500:
        logger.error(
            f"HTTP {exc.status_code}: {exc.detail}",
            extra={
                "event_type": "http_error",
                "status_code": exc.status_code,
                "detail": exc.detail,
                "path": str(request.url)
            }
        )
        
    elif exc.status_code >= 400:
        logger.warning(
            f"HTTP {exc.status_code}: {exc.detail}",
            extra={
                "event_type": "http_client_error",
                "status_code": exc.status_code,
                "detail": exc.detail,
                "path": str(request.url)
            }
        )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.detail,
                "status_code": exc.status_code,
                "type": "http_error"
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle validation errors (422)
    
    Logs validation failures and returns detailed error info
    """
    
    errors = exc.errors()
    
    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "event_type": "validation_error",
            "validation_errors": errors,
            "body": exc.body if hasattr(exc, "body") else None
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "message": "Validation error",
                "status_code": 422,
                "type": "validation_error",
                "details": errors
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle all unhandled exceptions
    
    Logs full stack trace and returns generic error to user
    """
    
    # Generate error ID for tracking
    import uuid
    error_id = str(uuid.uuid4())[:8]
    
    # Get stack trace
    stack_trace = traceback.format_exc()
    
    # Log full error with context
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True,
        extra={
            "event_type": "unhandled_exception",
            "error_id": error_id,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "path": str(request.url),
            "method": request.method
        }
    )
    
    # Return user-friendly error (hide internal details in production)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "message": "An internal error occurred. Please try again later.",
                "status_code": 500,
                "type": "internal_error",
                "error_id": error_id,  # User can report this ID
                "support": "If this persists, contact support with error ID"
            }
        }
    )


def setup_exception_handlers(app):
    """
    Register all exception handlers with FastAPI app
    
    Call this in main.py after creating the app
    """
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
