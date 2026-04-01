"""
Global Exception Handler for FastAPI

Catches all unhandled exceptions and logs them with full context.
Returns user-friendly error responses.
Integrates with error tracking database.

SECURITY NOTES:
- All request body logging is sanitized to prevent password/token leakage
- Sensitive fields (password, token, api_key, etc.) are redacted before logging
- Pydantic schemas use hide_input_in_errors=True for additional protection
- Error messages are generic to prevent information disclosure
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from app.infra.logging import get_logger
from app.db.session import get_db
from app.domain.documents.service.preview import PreviewNotFoundError


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
    
    Logs validation failures and returns detailed error info.
    
    SECURITY: Request body is sanitized before logging to prevent
    password and token leakage in logs. Sensitive fields are redacted.
    """
    
    errors = exc.errors()
    
    # Serialize errors to make them JSON-safe (convert ValueError objects to strings)
    serializable_errors = []
    for error in errors:
        error_dict = dict(error)
        if "ctx" in error_dict and "error" in error_dict["ctx"]:
            # Convert ValueError to string
            error_dict["ctx"]["error"] = str(error_dict["ctx"]["error"])
        serializable_errors.append(error_dict)
    
    # SECURITY: Sanitize request body to remove sensitive fields before logging
    # This prevents passwords, tokens, and other secrets from appearing in logs
    sanitized_body = None
    if hasattr(exc, "body") and exc.body:
        try:
            import json
            body_dict = json.loads(exc.body) if isinstance(exc.body, (str, bytes)) else exc.body
            if isinstance(body_dict, dict):
                # List of sensitive field names to redact
                sensitive_fields = {
                    "password", 
                    "current_password", 
                    "new_password", 
                    "confirm_password", 
                    "token",
                    "access_token",
                    "refresh_token",
                    "api_key",
                    "secret",
                    "private_key"
                }
                sanitized_body = {
                    k: "***REDACTED***" if k.lower() in sensitive_fields else v
                    for k, v in body_dict.items()
                }
            else:
                sanitized_body = body_dict
        except (json.JSONDecodeError, TypeError, ValueError, UnicodeDecodeError):
            sanitized_body = None
    
    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "event_type": "validation_error",
            "validation_errors": str(serializable_errors),
            "body": sanitized_body
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "message": "Validation error",
                "status_code": 422,
                "type": "validation_error",
                "details": serializable_errors
            }
        }
    )


async def preview_not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle PreviewNotFoundError - when document file is missing from storage
    
    Returns 404 with helpful message for users
    """
    logger.warning(
        f"Document file not found: {str(exc)}",
        extra={
            "event_type": "preview_not_found",
            "path": str(request.url),
            "exception_message": str(exc)
        }
    )
    
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "message": "Document file missing from storage. Please re-upload the document and try again.",
                "status_code": 404,
                "type": "preview_not_found",
                "detail": str(exc)
            }
        }
    )


async def preview_not_found_handler(request: Request, exc: PreviewNotFoundError) -> JSONResponse:
    """
    Handle PreviewNotFoundError specifically (404)
    
    Returns user-friendly message about missing document file
    """
    
    logger.warning(
        f"Document file not found: {str(exc)}",
        extra={
            "event_type": "preview_not_found",
            "path": str(request.url)
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": {
                "message": "Document file missing from storage. Please re-upload the document.",
                "status_code": 404,
                "type": "file_not_found"
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
    app.add_exception_handler(PreviewNotFoundError, preview_not_found_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
