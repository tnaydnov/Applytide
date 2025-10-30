"""
Admin User Management - Privileges & Permissions

Handles user privilege modifications:
- Toggle premium status
- Change user roles (user/admin)

All endpoints require admin authentication.
Critical security operations - all changes are logged.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.patch("/{user_id}/premium")
def toggle_user_premium(
    user_id: uuid.UUID,
    is_premium: bool,
    expires_at: Optional[datetime] = None,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Grant or revoke premium status for a user.
    
    Modifies user's premium account status and optionally sets
    expiration date. Critical for subscription management, promotions,
    and support operations.
    
    Path Parameters:
        user_id (UUID): ID of the user to modify
        
    Request Body:
        is_premium (bool): True to grant premium, False to revoke
        expires_at (datetime): Optional expiration timestamp (only for premium grants)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Operation result containing:
            - success (bool): True if operation succeeded
            - message (str): Human-readable confirmation
            - user_id (UUID): ID of modified user
            - is_premium (bool): New premium status
            - expires_at (datetime): Expiration timestamp (if set)
            
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if operation fails
        
    Security:
        Requires admin role authentication
        Logs info-level event with admin and target user IDs
        
    Notes:
        - Revoking premium automatically clears expires_at
        - expires_at is only used when is_premium=True
        - Premium features are immediately available/revoked
        - Use for: trial extensions, support escalations, promotions
        - All changes are logged with admin responsible
        
    Example:
        PATCH /api/admin/users/123e4567-e89b-12d3-a456-426614174000/premium
        Body: {"is_premium": true, "expires_at": "2024-12-31T23:59:59Z"}
        Grants premium until end of 2024
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_premium = is_premium
    user.premium_expires_at = expires_at if is_premium else None
    db.commit()
    
    logger.info(
        f"Admin {admin_user.email} {'granted' if is_premium else 'revoked'} premium for user {user.email}",
        extra={
            "admin_id": admin_user.id,
            "target_user_id": user_id,
            "action": "premium_toggle",
            "is_premium": is_premium,
            "expires_at": expires_at.isoformat() if expires_at else None
        }
    )
    
    return {
        "success": True,
        "message": f"Premium {'granted' if is_premium else 'revoked'} for user {user.email}",
        "user_id": user_id,
        "is_premium": is_premium,
        "premium_expires_at": expires_at
    }


@router.patch("/{user_id}/role")
def change_user_role(
    user_id: uuid.UUID,
    role: str,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Change a user's role (escalate to admin or demote to user).
    
    Modifies user's role with validation to prevent self-demotion
    and invalid roles. Critical security operation that must be
    carefully controlled and audited.
    
    Path Parameters:
        user_id (UUID): ID of the user to modify
        
    Request Body:
        role (str): New role - must be "user" or "admin"
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Operation result containing:
            - success (bool): True if operation succeeded
            - message (str): Human-readable confirmation
            - user_id (UUID): ID of modified user
            - old_role (str): Previous role
            - new_role (str): New role
            
    Raises:
        HTTPException: 400 if role is invalid
        HTTPException: 400 if attempting self-demotion
        HTTPException: 404 if user not found
        HTTPException: 500 if operation fails
        
    Security:
        Requires admin role authentication
        Logs WARNING-level event (critical security action)
        Prevents admins from demoting themselves
        
    Notes:
        - Only "user" and "admin" roles are valid
        - Self-demotion is blocked to prevent accidental lockout
        - Role changes are immediate and affect all permissions
        - All changes are logged with old and new roles
        - Use with extreme caution - grants full system access
        
    Example:
        PATCH /api/admin/users/123e4567-e89b-12d3-a456-426614174000/role
        Body: {"role": "admin"}
        Promotes user to admin role
    """
    if role not in ["user", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'user' or 'admin'"
        )
    
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-demotion
    if user.id == admin_user.id and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    old_role = user.role
    user.role = role
    db.commit()
    
    logger.warning(
        f"Admin {admin_user.email} changed role for user {user.email} from {old_role} to {role}",
        extra={
            "admin_id": admin_user.id,
            "target_user_id": user_id,
            "action": "role_change",
            "old_role": old_role,
            "new_role": role
        }
    )
    
    return {
        "success": True,
        "message": f"Role changed from '{old_role}' to '{role}' for user {user.email}",
        "user_id": user_id,
        "old_role": old_role,
        "new_role": role
    }
