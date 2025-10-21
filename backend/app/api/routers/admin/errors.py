"""
Admin endpoints for error tracking and monitoring
"""
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter
from ...deps_auth import get_admin_user
from ....db.session import get_db
from ....db import models
from ....infra.logging import get_logger
from ....infra.logging.error_tracking import (
    get_recent_errors,
    get_error_stats,
    mark_error_resolved
)

router = APIRouter(tags=["admin-errors"])
logger = get_logger(__name__)


class ErrorLogResponse(BaseModel):
    id: str
    created_at: datetime
    user_id: Optional[str]
    user_email: Optional[str]
    error_type: str
    error_message: str
    stack_trace: Optional[str]
    endpoint: Optional[str]
    method: Optional[str]
    status_code: Optional[int]
    ip_address: Optional[str]
    service: Optional[str]
    severity: str
    resolved: bool
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    resolution_notes: Optional[str]


class ErrorStatsResponse(BaseModel):
    total_errors: int
    unresolved: int
    by_severity: dict
    by_service: dict
    by_endpoint: dict
    time_period_hours: int


class ResolveErrorRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=1, max_length=1000)


@router.get(
    "/errors/recent",
    response_model=List[ErrorLogResponse],
    summary="Get Recent Errors"
)
@limiter.limit("60/minute")
async def get_errors(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    severity: Optional[str] = Query(None, regex="^(critical|error|warning)$"),
    resolved: Optional[bool] = None,
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get recent application errors
    
    Filters:
    - limit: Number of errors to return (1-500)
    - severity: Filter by severity (critical, error, warning)
    - resolved: Filter by resolution status
    - service: Filter by service name
    """
    try:
        errors = get_recent_errors(
            db=db,
            limit=limit,
            severity=severity,
            resolved=resolved,
            service=service
        )
        
        # Build response with user info
        response = []
        for error in errors:
            user_email = None
            if error.user_id:
                user = db.query(models.User).filter(
                    models.User.id == error.user_id
                ).first()
                if user:
                    user_email = user.email
            
            response.append(ErrorLogResponse(
                id=str(error.id),
                created_at=error.created_at,
                user_id=str(error.user_id) if error.user_id else None,
                user_email=user_email,
                error_type=error.error_type,
                error_message=error.error_message,
                stack_trace=error.stack_trace,
                endpoint=error.endpoint,
                method=error.method,
                status_code=error.status_code,
                ip_address=error.ip_address,
                service=error.service,
                severity=error.severity,
                resolved=error.resolved,
                resolved_at=error.resolved_at,
                resolved_by=str(error.resolved_by) if error.resolved_by else None,
                resolution_notes=error.resolution_notes
            ))
        
        logger.info(
            "Recent errors retrieved by admin",
            extra={
                "admin_id": str(current_admin.id),
                "error_count": len(response),
                "filters": {
                    "severity": severity,
                    "resolved": resolved,
                    "service": service
                }
            }
        )
        
        return response
    
    except Exception as e:
        logger.error(
            "Error retrieving error logs",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error logs"
        )


@router.get(
    "/errors/stats",
    response_model=ErrorStatsResponse,
    summary="Get Error Statistics"
)
@limiter.limit("60/minute")
async def get_error_statistics(
    request: Request,
    hours: int = Query(24, ge=1, le=168),  # Max 1 week
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get error statistics for specified time period
    
    Returns counts by severity, service, and endpoint
    """
    try:
        stats = get_error_stats(db=db, hours=hours)
        
        logger.info(
            "Error statistics retrieved by admin",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours,
                "total_errors": stats["total_errors"]
            }
        )
        
        return ErrorStatsResponse(**stats)
    
    except Exception as e:
        logger.error(
            "Error retrieving error statistics",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error statistics"
        )


@router.get(
    "/errors/{error_id}",
    response_model=ErrorLogResponse,
    summary="Get Error Details"
)
@limiter.limit("60/minute")
async def get_error_detail(
    request: Request,
    error_id: UUID,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get detailed information about a specific error
    """
    try:
        error = db.query(models.ErrorLog).filter(
            models.ErrorLog.id == error_id
        ).first()
        
        if not error:
            raise HTTPException(status_code=404, detail="Error not found")
        
        # Get user info if available
        user_email = None
        if error.user_id:
            user = db.query(models.User).filter(
                models.User.id == error.user_id
            ).first()
            if user:
                user_email = user.email
        
        logger.info(
            "Error detail retrieved by admin",
            extra={
                "admin_id": str(current_admin.id),
                "error_id": str(error_id)
            }
        )
        
        return ErrorLogResponse(
            id=str(error.id),
            created_at=error.created_at,
            user_id=str(error.user_id) if error.user_id else None,
            user_email=user_email,
            error_type=error.error_type,
            error_message=error.error_message,
            stack_trace=error.stack_trace,
            endpoint=error.endpoint,
            method=error.method,
            status_code=error.status_code,
            ip_address=error.ip_address,
            service=error.service,
            severity=error.severity,
            resolved=error.resolved,
            resolved_at=error.resolved_at,
            resolved_by=str(error.resolved_by) if error.resolved_by else None,
            resolution_notes=error.resolution_notes
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error retrieving error detail",
            extra={
                "admin_id": str(current_admin.id),
                "error_id": str(error_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error details"
        )


@router.post(
    "/errors/{error_id}/resolve",
    summary="Mark Error as Resolved"
)
@limiter.limit("30/minute")
async def resolve_error(
    request: Request,
    error_id: UUID,
    resolve_request: ResolveErrorRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Mark an error as resolved with resolution notes
    """
    try:
        success = mark_error_resolved(
            db=db,
            error_id=error_id,
            resolved_by=current_admin.id,
            resolution_notes=resolve_request.resolution_notes
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Error not found")
        
        logger.info(
            "Error marked as resolved by admin",
            extra={
                "admin_id": str(current_admin.id),
                "error_id": str(error_id)
            }
        )
        
        return {
            "message": "Error marked as resolved",
            "error_id": str(error_id)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error resolving error",
            extra={
                "admin_id": str(current_admin.id),
                "error_id": str(error_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to resolve error"
        )
