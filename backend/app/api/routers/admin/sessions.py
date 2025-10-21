"""
Admin endpoints for active session management
"""
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ._deps import limiter
from ...deps_auth import get_admin_user
from ....db.session import get_db
from ....db import models
from ....infra.logging import get_logger
from ....infra.security.session_tracking import cleanup_expired_sessions

router = APIRouter(tags=["admin-sessions"])
logger = get_logger(__name__)


class ActiveSessionResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_full_name: Optional[str]
    login_at: datetime
    last_activity_at: datetime
    expires_at: datetime
    ip_address: str
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    location: Optional[str]
    is_current: bool = False


class ActiveSessionsStatsResponse(BaseModel):
    total_active_sessions: int
    sessions_24h: int
    unique_users_online: int
    by_device_type: dict
    by_browser: dict
    sessions: List[ActiveSessionResponse]


@router.get(
    "/sessions/active",
    response_model=ActiveSessionsStatsResponse,
    summary="Get Active Sessions"
)
@limiter.limit("60/minute")
async def get_active_sessions(
    request: Request,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get all active user sessions
    
    Returns list of currently logged-in users with session details
    """
    try:
        # Cleanup expired sessions first
        cleanup_expired_sessions(db)
        
        # Get all active sessions with user info
        now = datetime.utcnow()
        sessions = (
            db.query(models.ActiveSession, models.User)
            .join(models.User, models.ActiveSession.user_id == models.User.id)
            .filter(models.ActiveSession.expires_at > now)
            .order_by(models.ActiveSession.last_activity_at.desc())
            .limit(limit)
            .all()
        )
        
        # Get current admin's session token for marking
        current_refresh_token = request.cookies.get("refresh_token", "")
        
        # Build response
        session_list = []
        device_types = {}
        browsers = {}
        unique_users = set()
        sessions_24h = 0
        
        from datetime import timedelta
        day_ago = now - timedelta(days=1)
        
        for session, user in sessions:
            # Count stats
            unique_users.add(str(session.user_id))
            if session.login_at >= day_ago:
                sessions_24h += 1
            
            device_types[session.device_type or 'unknown'] = \
                device_types.get(session.device_type or 'unknown', 0) + 1
            browsers[session.browser or 'unknown'] = \
                browsers.get(session.browser or 'unknown', 0) + 1
            
            # Build session response
            is_current = (session.session_token == current_refresh_token[:100])
            
            session_list.append(ActiveSessionResponse(
                id=str(session.id),
                user_id=str(session.user_id),
                user_email=user.email,
                user_full_name=user.full_name,
                login_at=session.login_at,
                last_activity_at=session.last_activity_at,
                expires_at=session.expires_at,
                ip_address=session.ip_address,
                device_type=session.device_type,
                browser=session.browser,
                os=session.os,
                location=session.location,
                is_current=is_current
            ))
        
        logger.info(
            "Active sessions retrieved by admin",
            extra={
                "admin_id": str(current_admin.id),
                "total_sessions": len(session_list),
                "unique_users": len(unique_users)
            }
        )
        
        return ActiveSessionsStatsResponse(
            total_active_sessions=len(session_list),
            sessions_24h=sessions_24h,
            unique_users_online=len(unique_users),
            by_device_type=device_types,
            by_browser=browsers,
            sessions=session_list
        )
    
    except Exception as e:
        logger.error(
            "Error retrieving active sessions",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve active sessions"
        )


@router.get(
    "/sessions/user/{user_id}",
    response_model=List[ActiveSessionResponse],
    summary="Get User's Active Sessions"
)
@limiter.limit("60/minute")
async def get_user_sessions(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get all active sessions for a specific user
    """
    try:
        # Get user
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get sessions
        now = datetime.utcnow()
        sessions = (
            db.query(models.ActiveSession)
            .filter(
                models.ActiveSession.user_id == user_id,
                models.ActiveSession.expires_at > now
            )
            .order_by(models.ActiveSession.last_activity_at.desc())
            .all()
        )
        
        session_list = [
            ActiveSessionResponse(
                id=str(session.id),
                user_id=str(session.user_id),
                user_email=user.email,
                user_full_name=user.full_name,
                login_at=session.login_at,
                last_activity_at=session.last_activity_at,
                expires_at=session.expires_at,
                ip_address=session.ip_address,
                device_type=session.device_type,
                browser=session.browser,
                os=session.os,
                location=session.location
            )
            for session in sessions
        ]
        
        logger.info(
            "User sessions retrieved by admin",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "session_count": len(session_list)
            }
        )
        
        return session_list
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error retrieving user sessions",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user sessions"
        )


@router.post(
    "/sessions/cleanup",
    summary="Cleanup Expired Sessions"
)
@limiter.limit("10/minute")
async def cleanup_sessions(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Manually trigger cleanup of expired sessions
    """
    try:
        count = cleanup_expired_sessions(db)
        
        logger.info(
            "Expired sessions cleaned up by admin",
            extra={
                "admin_id": str(current_admin.id),
                "sessions_removed": count
            }
        )
        
        return {
            "message": f"Cleaned up {count} expired sessions",
            "sessions_removed": count
        }
    
    except Exception as e:
        logger.error(
            "Error cleaning up expired sessions",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to cleanup expired sessions"
        )
