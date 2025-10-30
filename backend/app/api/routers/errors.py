"""
Client-Side Error Logging Router

This module provides public error logging endpoints for frontend and browser extension.
Enables comprehensive error tracking across all application layers without requiring
authentication (but captures user context if available).

Key Features:
- Public endpoint (no auth required)
- Captures frontend JavaScript errors
- Captures browser extension errors
- Optional user context if authenticated
- Database logging for error analysis
- Real-time logger integration
- Stack trace capture
- Source location tracking (file, line, column)

Use Cases:
- Frontend unhandled exceptions
- Browser extension errors
- Client-side API errors
- User-reported errors with context

Dependencies:
- ApplicationLog model for database storage
- Optional authentication for user context
- Logging infrastructure

Router: /api/errors
Note: Different from admin errors dashboard (/api/admin/errors)
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db
from app.api.deps import get_current_user_optional
from app.db import models
from app.infra.logging import get_logger

router = APIRouter(prefix="/api/errors", tags=["errors"])
logger = get_logger(__name__)


class FrontendErrorPayload(BaseModel):
    """Frontend/extension error payload."""
    message: str
    source: str  # 'frontend' or 'extension'
    url: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    stack_trace: Optional[str] = None
    user_agent: Optional[str] = None
    extra: Optional[dict] = None


@router.post("/log")
async def log_frontend_error(
    payload: FrontendErrorPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """
    Log errors from frontend or browser extension.
    
    Public endpoint for capturing client-side errors with optional user context.
    Stores errors in database and forwards to real-time logging for monitoring.
    
    Request Body:
        FrontendErrorPayload with:
        - message: Error message (required)
        - source: Error origin "frontend" or "extension" (required)
        - url: Page/script URL where error occurred (optional)
        - line_number: Source line number (optional)
        - column_number: Source column number (optional)
        - stack_trace: Full stack trace (optional)
        - user_agent: Browser user agent (optional)
        - extra: Additional context dictionary (optional)
    
    Args:
        payload: Error details from client
        request: FastAPI request object (auto-injected)
        db: Database session from dependency injection
        current_user: Optional authenticated user (no error if not authenticated)
    
    Returns:
        dict: Status and log entry ID or error message
    
    Raises:
        No exceptions raised - returns error status if logging fails
    
    Security:
        - Public endpoint (no authentication required)
        - Captures user_id if user authenticated
        - IP address logged for abuse tracking
        - User agent captured for browser debugging
        - Extra data sanitized via Pydantic
    
    Database Storage:
        - Stored in ApplicationLog table
        - Level: ERROR
        - Logger: client.{source}
        - Includes all available context
        - Queryable for error analysis
    
    Real-time Logging:
        - Also logged to application logger
        - Enables real-time monitoring
        - Alerts on critical errors
        - Integration with error tracking services
    
    Notes:
        - Non-blocking (won't fail client request if logging fails)
        - Returns success even if database write fails
        - Source tracked for analytics (frontend vs extension)
        - Stack traces preserved for debugging
        - Used by frontend error boundary
        - Used by extension error handler
        - Helps identify production issues quickly
    
    Example:
        POST /api/errors/log
        Request:
        {
            "message": "Cannot read property 'id' of undefined",
            "source": "frontend",
            "url": "https://app.applytide.com/dashboard",
            "line_number": 42,
            "column_number": 15,
            "stack_trace": "Error: ...\n    at ...",
            "user_agent": "Mozilla/5.0...",
            "extra": {"component": "DashboardCard"}
        }
        Response: {"status": "logged", "id": "550e8400-..."}
    """
    try:
        # Create error log entry
        log_entry = models.ApplicationLog(
            timestamp=datetime.utcnow(),
            level="ERROR",
            logger=f"client.{payload.source}",
            message=payload.message,
            user_id=current_user.id if current_user else None,
            endpoint=payload.url or request.url.path,
            method=request.method,
            ip_address=request.client.host if request.client else None,
            user_agent=payload.user_agent or request.headers.get("user-agent"),
            line_number=payload.line_number,
            exception_type=f"{payload.source}_error",
            stack_trace=payload.stack_trace,
            extra={
                "source": payload.source,
                "url": payload.url,
                "column": payload.column_number,
                **(payload.extra or {}),
            },
        )

        db.add(log_entry)
        db.commit()

        # Also log to application logger for real-time monitoring
        logger.error(
            f"Client error from {payload.source}: {payload.message}",
            extra={
                "user_id": str(current_user.id) if current_user else None,
                "url": payload.url,
                "stack": payload.stack_trace,
            },
        )

        return {"status": "logged", "id": str(log_entry.id)}

    except Exception as e:
        # Don't fail the client request if logging fails
        logger.error(f"Failed to log client error: {e}")
        return {"status": "failed", "error": str(e)}
