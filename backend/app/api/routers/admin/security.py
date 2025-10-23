"""
Admin Security Monitoring Endpoints

Provides security event tracking and statistics for the admin panel.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto

router = APIRouter(prefix="/security", tags=["admin-security"])


@router.get("/stats", response_model=dto.SecurityStatsDTO)
async def get_security_stats(
    hours: int = Query(24, description="Time window in hours"),
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get security statistics for the specified time window.
    
    Returns counts of:
    - Failed login attempts
    - Rate limit violations
    - Token revocations
    - Suspicious activity patterns
    """
    admin_service = AdminService(db)
    return admin_service.get_security_stats(hours=hours)


@router.get("/events")
async def get_security_events(
    hours: Optional[int] = Query(24, description="Time window in hours"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of security events with optional filters.
    
    Event types:
    - failed_login: Failed authentication attempts
    - rate_limit_exceeded: Rate limit violations
    - token_revoked: Manual session terminations
    - suspicious_activity: Detected suspicious patterns
    """
    admin_service = AdminService(db)
    return admin_service.get_security_events(
        hours=hours,
        event_type=event_type,
        page=page,
        page_size=page_size
    )
