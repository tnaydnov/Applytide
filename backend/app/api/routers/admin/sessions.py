"""
Admin Session Management Endpoints

Provides session monitoring and management capabilities for administrators.
This module contains endpoints for:
- Session listing with filtering and pagination
- Session statistics (active, expiring, expired)
- Session revocation (force logout)

All endpoints require admin authentication via get_admin_user dependency.

Sessions are tracked using RefreshToken model and include:
- User identification (user_id, email)
- Session lifecycle (created_at, expires_at, last_used_at)
- Device context (user_agent)
- Active status (is_active flag)

Use cases:
- Monitor active user sessions across the platform
- Identify security issues (suspicious sessions, leaked tokens)
- Force logout users for security or policy reasons
- Track session expiration and cleanup needs
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin import dto
from app.infra.logging import get_logger

router = APIRouter(prefix="/sessions", tags=["admin-sessions"])
logger = get_logger(__name__)


@router.get("/", response_model=dto.PaginatedSessionsDTO)
def list_sessions(
    page: int = 1,
    page_size: int = 20,
    user_id: Optional[uuid.UUID] = None,
    active_only: bool = True,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated list of user sessions with optional filtering.
    
    Returns comprehensive session information including user details,
    lifecycle timestamps, and device information. Essential for security
    monitoring and user session management.
    
    Query Parameters:
        page (int): Page number, starting from 1 (default: 1)
        page_size (int): Items per page, range 1-100 (default: 20)
        user_id (UUID): Filter by specific user ID (optional)
        active_only (bool): Only show active sessions (default: true)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        PaginatedSessionsDTO: Paginated list containing:
            - items: List of SessionDTO objects with:
                - id: Session identifier
                - user_id: User UUID
                - user_email: User email address
                - created_at: Session creation timestamp
                - expires_at: Session expiration timestamp
                - last_used_at: Last activity timestamp
                - device_info: User agent string
            - total: Total count of matching sessions
            - page: Current page number
            - page_size: Items per page
            - total_pages: Total pages available
            
    Raises:
        HTTPException: 500 if sessions cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Sessions are sorted by creation date (newest first)
        - Active sessions: is_active=true AND expires_at > now
        - Page size is automatically capped at 100
        - Invalid pagination parameters are automatically corrected
        - User email is resolved from User table (shows "Unknown" if not found)
        
    Example:
        GET /api/admin/sessions?user_id=123e4567-e89b-12d3-a456-426614174000&active_only=true
        Returns all active sessions for the specified user
    """
    try:
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100
        
        logger.debug(
            "Admin listing sessions",
            extra={
                "admin_id": str(admin_user.id),
                "page": page,
                "page_size": page_size,
                "user_id": str(user_id) if user_id else None,
                "active_only": active_only
            }
        )
        
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
                device_info=session.user_agent  # RefreshToken model uses user_agent, not device_info
            ))
        
        logger.info(
            "Sessions retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_sessions": total,
                "returned_count": len(items)
            }
        )
        
        return dto.PaginatedSessionsDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        )
        
    except Exception as e:
        logger.error(
            "Error listing sessions",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve sessions"
        )


@router.get("/stats", response_model=dto.SessionStatsDTO)
def get_session_stats(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve session statistics for monitoring and maintenance.
    
    Provides aggregated counts of sessions in different states.
    Essential for identifying session cleanup needs and monitoring
    overall platform activity.
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        SessionStatsDTO: Statistics object containing:
            - total_active: Count of active, non-expired sessions
            - expiring_soon: Count of sessions expiring within 24 hours
            - expired_uncleaned: Count of expired sessions still marked active
                (indicates need for cleanup job)
                
    Raises:
        HTTPException: 500 if statistics cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Active sessions: is_active=true AND expires_at > now
        - Expiring soon: expires_at between now and now+24h
        - Expired uncleaned indicates orphaned sessions (cleanup needed)
        - Use for system health monitoring
        - High expired_uncleaned count suggests cleanup job failures
        
    Example:
        GET /api/admin/sessions/stats
        Returns current session statistics
    """
    try:
        logger.debug(
            "Admin fetching session stats",
            extra={"admin_id": str(admin_user.id)}
        )
        
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
        
        logger.info(
            "Session stats retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_active": total_active,
                "expired_uncleaned": expired_uncleaned
            }
        )
        
        return dto.SessionStatsDTO(
            total_active=total_active,
            expiring_soon=expiring_soon,
            expired_uncleaned=expired_uncleaned
        )
        
    except Exception as e:
        logger.error(
            "Error fetching session stats",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch session statistics"
        )


@router.delete("/{session_id}")
def revoke_session(
    session_id: uuid.UUID,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a specific user session (force logout).
    
    Immediately terminates the specified session by setting is_active
    to false. The user will be logged out and must re-authenticate.
    This is a critical security action that should be logged and audited.
    
    Path Parameters:
        session_id (UUID): ID of the session to revoke
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Operation result containing:
            - success (bool): True if revocation succeeded
            - message (str): Human-readable confirmation
            - session_id (UUID): ID of revoked session
            - user_id (UUID): ID of affected user
            
    Raises:
        HTTPException: 404 if session not found
        
    Security:
        Requires admin role authentication
        Logs security warning with admin and target user details
        
    Notes:
        - Session revocation is immediate and irreversible
        - User must re-authenticate to establish new session
        - Use for: security incidents, policy violations, support requests
        - All revocations are logged with WARNING level
        - Includes both admin and target user in audit trail
        
    Example:
        DELETE /api/admin/sessions/123e4567-e89b-12d3-a456-426614174000
        Immediately revokes the specified session
    """
    try:
        # Log the revocation attempt
        logger.debug(
            "Admin attempting to revoke session",
            extra={
                "admin_id": str(admin_user.id),
                "session_id": str(session_id)
            }
        )
        
        # Find the session
        session = db.get(models.RefreshToken, session_id)
        if not session:
            logger.warning(
                "Session not found for revocation",
                extra={
                    "admin_id": str(admin_user.id),
                    "session_id": str(session_id)
                }
            )
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
        
        # Log security warning with full context
        logger.warning(
            f"Admin {admin_user.email} revoked session {session_id} for user {user_email}",
            extra={
                "admin_id": str(admin_user.id),
                "session_id": str(session_id),
                "target_user_id": str(session.user_id),
                "action": "session_revoked"
            }
        )
        
        return {
            "success": True,
            "message": f"Session revoked for user {user_email}",
            "session_id": str(session_id),
            "user_id": str(session.user_id)
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(
            "Error revoking session",
            extra={
                "admin_id": str(admin_user.id),
                "session_id": str(session_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to revoke session"
        )
