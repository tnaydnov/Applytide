"""
Active session tracking utility
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import uuid
from sqlalchemy.orm import Session
from ...db import models
from ..logging import get_logger

logger = get_logger(__name__)


def parse_user_agent(user_agent: str) -> Dict[str, Optional[str]]:
    """
    Parse user agent string to extract device, browser, and OS info
    Simple parsing - could be enhanced with user-agents library
    """
    ua_lower = user_agent.lower()
    
    # Detect device type
    if any(x in ua_lower for x in ['mobile', 'android', 'iphone', 'ipad']):
        device_type = 'mobile'
    elif 'tablet' in ua_lower or 'ipad' in ua_lower:
        device_type = 'tablet'
    else:
        device_type = 'desktop'
    
    # Detect browser
    if 'edg' in ua_lower:
        browser = 'Edge'
    elif 'chrome' in ua_lower:
        browser = 'Chrome'
    elif 'firefox' in ua_lower:
        browser = 'Firefox'
    elif 'safari' in ua_lower:
        browser = 'Safari'
    elif 'opera' in ua_lower or 'opr' in ua_lower:
        browser = 'Opera'
    else:
        browser = 'Unknown'
    
    # Detect OS
    if 'windows' in ua_lower:
        os_name = 'Windows'
    elif 'mac' in ua_lower or 'darwin' in ua_lower:
        os_name = 'macOS'
    elif 'linux' in ua_lower:
        os_name = 'Linux'
    elif 'android' in ua_lower:
        os_name = 'Android'
    elif 'ios' in ua_lower or 'iphone' in ua_lower or 'ipad' in ua_lower:
        os_name = 'iOS'
    else:
        os_name = 'Unknown'
    
    return {
        'device_type': device_type,
        'browser': browser,
        'os': os_name
    }


def create_active_session(
    db: Session,
    user_id: uuid.UUID,
    session_token: str,
    ip_address: str,
    user_agent: str,
    expires_at: datetime,
    location: Optional[str] = None
) -> Optional[models.ActiveSession]:
    """
    Create a new active session record
    
    Args:
        db: Database session
        user_id: User UUID
        session_token: Refresh token or session identifier
        ip_address: Client IP address
        user_agent: User agent string
        expires_at: Session expiration time
        location: Optional geographic location
    
    Returns:
        ActiveSession model instance or None on failure
    """
    try:
        # Parse user agent
        ua_info = parse_user_agent(user_agent)
        
        # Create session record
        active_session = models.ActiveSession(
            id=uuid.uuid4(),
            user_id=user_id,
            session_token=session_token[:100],  # Truncate if needed
            login_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            ip_address=ip_address[:45],  # IPv6 max length
            user_agent=user_agent[:500],  # Truncate long user agents
            device_type=ua_info['device_type'],
            browser=ua_info['browser'],
            os=ua_info['os'],
            location=location[:100] if location else None
        )
        
        db.add(active_session)
        db.commit()
        db.refresh(active_session)
        
        logger.info("Active session created", extra={
            "user_id": str(user_id),
            "session_id": str(active_session.id),
            "device_type": ua_info['device_type'],
            "browser": ua_info['browser'],
            "ip_address": ip_address
        })
        
        return active_session
    
    except Exception as e:
        logger.error("Failed to create active session", extra={
            "user_id": str(user_id),
            "error": str(e)
        }, exc_info=True)
        db.rollback()
        return None


def update_session_activity(
    db: Session,
    session_token: str
) -> bool:
    """
    Update last activity timestamp for a session
    
    Args:
        db: Database session
        session_token: Session token to update
    
    Returns:
        True if updated successfully, False otherwise
    """
    try:
        session = db.query(models.ActiveSession).filter(
            models.ActiveSession.session_token == session_token[:100]
        ).first()
        
        if session:
            session.last_activity_at = datetime.now(timezone.utc)
            db.commit()
            return True
        
        return False
    
    except Exception as e:
        logger.error("Failed to update session activity", extra={
            "error": str(e)
        })
        db.rollback()
        return False


def remove_session(
    db: Session,
    session_token: str
) -> bool:
    """
    Remove an active session (on logout)
    
    Args:
        db: Database session
        session_token: Session token to remove
    
    Returns:
        True if removed successfully, False otherwise
    """
    try:
        deleted = db.query(models.ActiveSession).filter(
            models.ActiveSession.session_token == session_token[:100]
        ).delete()
        
        db.commit()
        
        if deleted:
            logger.info("Active session removed", extra={
                "session_token": session_token[:20] + "..."
            })
        
        return deleted > 0
    
    except Exception as e:
        logger.error("Failed to remove session", extra={
            "error": str(e)
        })
        db.rollback()
        return False


def cleanup_expired_sessions(db: Session) -> int:
    """
    Remove expired sessions from database
    
    Args:
        db: Database session
    
    Returns:
        Number of sessions removed
    """
    try:
        now = datetime.now(timezone.utc)
        
        deleted = db.query(models.ActiveSession).filter(
            models.ActiveSession.expires_at < now
        ).delete()
        
        db.commit()
        
        if deleted > 0:
            logger.info("Expired sessions cleaned up", extra={
                "count": deleted
            })
        
        return deleted
    
    except Exception as e:
        logger.error("Failed to cleanup expired sessions", extra={
            "error": str(e)
        })
        db.rollback()
        return 0


def get_user_active_sessions(
    db: Session,
    user_id: uuid.UUID
) -> list[models.ActiveSession]:
    """
    Get all active sessions for a user
    
    Args:
        db: Database session
        user_id: User UUID
    
    Returns:
        List of active sessions
    """
    try:
        now = datetime.now(timezone.utc)
        
        sessions = db.query(models.ActiveSession).filter(
            models.ActiveSession.user_id == user_id,
            models.ActiveSession.expires_at > now
        ).order_by(
            models.ActiveSession.last_activity_at.desc()
        ).all()
        
        return sessions
    
    except Exception as e:
        logger.error("Failed to get user sessions", extra={
            "user_id": str(user_id),
            "error": str(e)
        })
        return []
