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
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.infra.logging import get_logger
from app.api.schemas.common import SubscriptionUpdateResponse, RoleChangeResponse

router = APIRouter()
logger = get_logger(__name__)


class UpdateSubscriptionRequest(BaseModel):
    """Request body for updating user subscription."""
    subscription_plan: str
    subscription_status: str
    subscription_ends_at: Optional[datetime] = None


@router.patch("/{user_id}/premium", response_model=SubscriptionUpdateResponse)
def toggle_user_premium(
    user_id: uuid.UUID,
    request: UpdateSubscriptionRequest,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Grant or revoke premium status for a user.
    
    Modifies user's subscription plan, status, and optionally sets
    expiration date. Critical for subscription management, promotions,
    and support operations.
    
    Path Parameters:
        user_id (UUID): ID of the user to modify
        
    Request Body:
        subscription_plan (str): Plan name (e.g., 'starter', 'pro', 'premium')
        subscription_status (str): Status (e.g., 'active', 'canceled', 'expired')
        subscription_ends_at (datetime): Optional expiration timestamp
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Operation result containing:
            - success (bool): True if operation succeeded
            - message (str): Human-readable confirmation
            - user_id (UUID): ID of modified user
            - subscription_plan (str): New subscription plan
            - subscription_status (str): New subscription status
            - subscription_ends_at (datetime): Expiration timestamp (if set)
            
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if operation fails
        
    Security:
        Requires admin role authentication
        Logs info-level event with admin and target user IDs
        
    Notes:
        - Revoking premium (setting to 'starter') automatically clears subscription_ends_at
        - subscription_ends_at is only used for paid plans
        - Premium features are immediately available/revoked
        - Use for: trial extensions, support escalations, promotions
        - All changes are logged with admin responsible
        
    Example:
        PATCH /api/admin/users/123e4567-e89b-12d3-a456-426614174000/premium
        Body: {"subscription_plan": "premium", "subscription_status": "active", "subscription_ends_at": "2024-12-31T23:59:59Z"}
        Grants premium until end of 2024
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.subscription_plan = request.subscription_plan
    user.subscription_status = request.subscription_status
    user.subscription_ends_at = request.subscription_ends_at if request.subscription_plan != 'starter' else None
    
    # If granting paid plan, set started_at if not already set
    if request.subscription_plan != 'starter' and not user.subscription_started_at:
        user.subscription_started_at = datetime.now()
    
    # If moving back to starter, clear subscription dates
    if request.subscription_plan == 'starter':
        user.subscription_started_at = None
        user.subscription_renews_at = None
        user.subscription_canceled_at = None
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subscription"
        )
    
    logger.info(
        f"Admin {admin_user.email} changed subscription for user {user.email} to {request.subscription_plan} ({request.subscription_status})",
        extra={
            "admin_id": admin_user.id,
            "target_user_id": user_id,
            "action": "subscription_change",
            "subscription_plan": request.subscription_plan,
            "subscription_status": request.subscription_status,
            "subscription_ends_at": request.subscription_ends_at.isoformat() if request.subscription_ends_at else None
        }
    )
    
    return {
        "success": True,
        "message": f"Subscription changed to {request.subscription_plan} ({request.subscription_status}) for user {user.email}",
        "user_id": user_id,
        "subscription_plan": request.subscription_plan,
        "subscription_status": request.subscription_status,
        "subscription_ends_at": request.subscription_ends_at
    }


@router.patch("/{user_id}/role", response_model=RoleChangeResponse)
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
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change user role"
        )
    
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
