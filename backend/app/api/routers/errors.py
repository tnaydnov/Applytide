"""
Public error logging endpoint for frontend and extension.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db
from app.api.deps_auth import get_current_user_optional
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
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Log errors from frontend or extension.
    
    This endpoint is public but will capture user_id if authenticated.
    Used for comprehensive error tracking across all application layers.
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
                **(payload.extra or {})
            }
        )
        
        db.add(log_entry)
        db.commit()
        
        # Also log to application logger for real-time monitoring
        logger.error(
            f"Client error from {payload.source}: {payload.message}",
            extra={
                "user_id": str(current_user.id) if current_user else None,
                "url": payload.url,
                "stack": payload.stack_trace
            }
        )
        
        return {"status": "logged", "id": str(log_entry.id)}
        
    except Exception as e:
        # Don't fail the client request if logging fails
        logger.error(f"Failed to log client error: {e}")
        return {"status": "failed", "error": str(e)}
