"""
Admin error monitoring endpoints.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin import dto

router = APIRouter(prefix="/errors", tags=["admin-errors"])


@router.get("", response_model=dto.PaginatedErrorsDTO)
def list_errors(
    page: int = 1,
    page_size: int = 20,
    level: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    endpoint: Optional[str] = None,
    hours: Optional[int] = None,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List error logs with filters and pagination.
    
    Query params:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - level: Filter by level (ERROR/CRITICAL/WARNING)
    - user_id: Filter by user ID
    - endpoint: Filter by endpoint (partial match)
    - hours: Only show errors from last N hours
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100
    
    # Base query - only errors and critical
    stmt = select(models.ApplicationLog).where(
        models.ApplicationLog.level.in_(["ERROR", "CRITICAL", "WARNING"])
    )
    
    # Apply filters
    if level:
        stmt = stmt.where(models.ApplicationLog.level == level.upper())
    
    if user_id:
        stmt = stmt.where(models.ApplicationLog.user_id == user_id)
    
    if endpoint:
        stmt = stmt.where(models.ApplicationLog.endpoint.ilike(f"%{endpoint}%"))
    
    if hours:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        stmt = stmt.where(models.ApplicationLog.timestamp >= cutoff)
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(desc(models.ApplicationLog.timestamp))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    logs = db.scalars(stmt).all()
    
    # Build DTOs
    items = []
    for log in logs:
        # Get user email if user_id exists
        user_email = None
        if log.user_id:
            user = db.get(models.User, log.user_id)
            user_email = user.email if user else None
        
        items.append(dto.ErrorLogDTO(
            id=log.id,
            timestamp=log.timestamp,
            level=log.level,
            message=log.message,
            user_id=log.user_id,
            user_email=user_email,
            endpoint=log.endpoint,
            status_code=log.status_code
        ))
    
    return dto.PaginatedErrorsDTO(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/summary", response_model=dto.ErrorSummaryDTO)
def get_error_summary(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get error summary statistics.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Total errors (ERROR + CRITICAL only)
    total_errors = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]))
    ) or 0
    
    # Critical count
    critical_count = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(models.ApplicationLog.level == "CRITICAL")
    ) or 0
    
    # Error count
    error_count = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(models.ApplicationLog.level == "ERROR")
    ) or 0
    
    # Warning count
    warning_count = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(models.ApplicationLog.level == "WARNING")
    ) or 0
    
    # Errors today
    errors_today = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(
            and_(
                models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]),
                models.ApplicationLog.timestamp >= today_start
            )
        )
    ) or 0
    
    # Errors this week
    errors_this_week = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(
            and_(
                models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]),
                models.ApplicationLog.timestamp >= week_start
            )
        )
    ) or 0
    
    return dto.ErrorSummaryDTO(
        total_errors=total_errors,
        critical_count=critical_count,
        error_count=error_count,
        warning_count=warning_count,
        errors_today=errors_today,
        errors_this_week=errors_this_week
    )


@router.get("/{log_id}")
def get_error_detail(
    log_id: uuid.UUID,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed error log information including full metadata.
    """
    log = db.get(models.ApplicationLog, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error log not found"
        )
    
    # Get user info if exists
    user_info = None
    if log.user_id:
        user = db.get(models.User, log.user_id)
        if user:
            user_info = {
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
    
    return {
        "id": log.id,
        "timestamp": log.timestamp,
        "level": log.level,
        "message": log.message,
        "endpoint": log.endpoint,
        "method": log.method,
        "status_code": log.status_code,
        "user_id": log.user_id,
        "user": user_info,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "duration_ms": log.duration_ms,
        "metadata": log.metadata  # Full JSON metadata
    }
