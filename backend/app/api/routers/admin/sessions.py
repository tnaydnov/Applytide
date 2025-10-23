"""
Admin session management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin import dto
from app.infra.logging import get_logger

router = APIRouter(prefix="/sessions", tags=["admin-sessions"])
logger = get_logger(__name__)


@router.get("", response_model=dto.PaginatedSessionsDTO)
def list_sessions(
    page: int = 1,
    page_size: int = 20,
    user_id: Optional[int] = None,
    active_only: bool = True,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List sessions with filters and pagination.
    
    Query params:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - user_id: Filter by user ID
    - active_only: Only show active sessions (default: true)
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100
    
    now = datetime.utcnow()
    
    # Base query
    stmt = select(models.RefreshToken)
    
    # Apply filters
    filters = []
    if active_only:
        filters.append(models.RefreshToken.is_active == True)
        filters.append(models.RefreshToken.expires_at > now)
    
    if user_id:
        filters.append(models.RefreshToken.user_id == user_id)
    
    if filters:
        stmt = stmt.where(and_(*filters))
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(desc(models.RefreshToken.created_at))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    sessions = db.scalars(stmt).all()
    
    # Build DTOs
    items = []
    for session in sessions:
        # Get user email
        user = db.get(models.User, session.user_id)
        user_email = user.email if user else "Unknown"
        
        items.append(dto.SessionDTO(
            id=session.id,
            user_id=session.user_id,
            user_email=user_email,
            created_at=session.created_at,
            expires_at=session.expires_at,
            last_used_at=session.last_used_at,
            device_info=session.device_info
        ))
    
    return dto.PaginatedSessionsDTO(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/stats", response_model=dto.SessionStatsDTO)
def get_session_stats(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get session statistics.
    """
    now = datetime.utcnow()
    expiring_threshold = now + timedelta(hours=24)
    
    # Total active sessions
    total_active = db.scalar(
        select(func.count(models.RefreshToken.id))
        .where(
            and_(
                models.RefreshToken.is_active == True,
                models.RefreshToken.expires_at > now
            )
        )
    ) or 0
    
    # Expiring soon (within 24 hours)
    expiring_soon = db.scalar(
        select(func.count(models.RefreshToken.id))
        .where(
            and_(
                models.RefreshToken.is_active == True,
                models.RefreshToken.expires_at > now,
                models.RefreshToken.expires_at <= expiring_threshold
            )
        )
    ) or 0
    
    # Expired but still marked active (need cleanup)
    expired_uncleaned = db.scalar(
        select(func.count(models.RefreshToken.id))
        .where(
            and_(
                models.RefreshToken.is_active == True,
                models.RefreshToken.expires_at <= now
            )
        )
    ) or 0
    
    return dto.SessionStatsDTO(
        total_active=total_active,
        expiring_soon=expiring_soon,
        expired_uncleaned=expired_uncleaned
    )


@router.delete("/{session_id}")
def revoke_session(
    session_id: int,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a specific session (force logout).
    """
    session = db.get(models.RefreshToken, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get user info for logging
    user = db.get(models.User, session.user_id)
    user_email = user.email if user else "Unknown"
    
    # Revoke session
    session.is_active = False
    db.commit()
    
    logger.warning(
        f"Admin {admin_user.email} revoked session {session_id} for user {user_email}",
        extra={
            "admin_id": admin_user.id,
            "session_id": session_id,
            "target_user_id": session.user_id,
            "action": "session_revoked"
        }
    )
    
    return {
        "success": True,
        "message": f"Session revoked for user {user_email}",
        "session_id": session_id,
        "user_id": session.user_id
    }
