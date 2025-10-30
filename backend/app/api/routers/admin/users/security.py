"""
Admin User Management - Security Actions

Handles security-related user operations:
- Revoke all user sessions (force logout)

All endpoints require admin authentication.
Critical security operations - all actions are logged.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/{user_id}/revoke-sessions")
def revoke_user_sessions(
    user_id: uuid.UUID,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Revoke all active sessions for a user (force global logout).
    
    Immediately terminates all active sessions for the specified user,
    forcing them to re-authenticate on all devices. Critical security
    operation for compromised accounts or policy enforcement.
    
    Path Parameters:
        user_id (UUID): ID of the user whose sessions to revoke
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Operation result containing:
            - success (bool): True if operation succeeded
            - message (str): Confirmation with count of revoked sessions
            - user_id (UUID): ID of affected user
            - revoked_count (int): Number of sessions revoked
            
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if operation fails
        
    Security:
        Requires admin role authentication
        Logs WARNING-level event (security action)
        
    Notes:
        - Revokes ALL active sessions simultaneously
        - User must re-authenticate on all devices
        - Sessions are marked inactive and revoked_at timestamp is set
        - Use for: compromised accounts, policy violations, security incidents
        - Does not prevent user from logging in again
        - All revocations are logged with count
        
    Example:
        POST /api/admin/users/123e4567-e89b-12d3-a456-426614174000/revoke-sessions
        Revokes all sessions for the user across all devices
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Find and deactivate all active sessions
    sessions = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.is_active == True,
        models.RefreshToken.revoked_at.is_(None)
    ).all()
    
    count = 0
    now = datetime.utcnow()
    for session in sessions:
        session.is_active = False
        session.revoked_at = now
        count += 1
    
    db.commit()
    
    logger.warning(
        f"Admin {admin_user.email} revoked {count} sessions for user {user.email}",
        extra={
            "admin_id": str(admin_user.id),
            "target_user_id": str(user_id),
            "action": "sessions_revoked",
            "sessions_count": count
        }
    )
    
    return {
        "success": True,
        "message": f"Revoked {count} active session(s) for user {user.email}",
        "user_id": user_id,
        "sessions_revoked": count
    }
