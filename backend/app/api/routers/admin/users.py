"""
Admin users management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto
from app.infra.logging import get_logger

router = APIRouter(prefix="/users", tags=["admin-users"])
logger = get_logger(__name__)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get admin service instance."""
    return AdminService(db)


@router.get("", response_model=dto.PaginatedUsersDTO)
def list_users(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_premium: Optional[bool] = None,
    email_verified: Optional[bool] = None,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    List all users with filters and pagination.
    
    Query params:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - search: Search by email or location
    - role: Filter by role (user/admin)
    - is_premium: Filter by premium status
    - email_verified: Filter by email verification status
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100
    
    return service.get_users(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_premium=is_premium,
        email_verified=email_verified
    )


@router.get("/{user_id}", response_model=dto.UserDetailDTO)
def get_user(
    user_id: int,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get detailed information about a specific user.
    """
    user = service.get_user_detail(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.patch("/{user_id}/premium")
def toggle_user_premium(
    user_id: int,
    is_premium: bool,
    expires_at: Optional[datetime] = None,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Toggle user premium status.
    
    Body:
    - is_premium: True to grant premium, False to revoke
    - expires_at: Optional expiration date (only if is_premium=True)
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
    user_id: int,
    role: str,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Change user role.
    
    Body:
    - role: New role (user/admin)
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


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user and all their data.
    
    WARNING: This is permanent and cannot be undone!
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user_email = user.email
    
    # Delete user (cascade will handle related records)
    db.delete(user)
    db.commit()
    
    logger.warning(
        f"Admin {admin_user.email} deleted user {user_email}",
        extra={
            "admin_id": admin_user.id,
            "deleted_user_id": user_id,
            "deleted_user_email": user_email,
            "action": "user_deletion"
        }
    )
    
    return {
        "success": True,
        "message": f"User {user_email} has been permanently deleted",
        "deleted_user_id": user_id
    }


@router.post("/{user_id}/revoke-sessions")
def revoke_user_sessions(
    user_id: int,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Revoke all active sessions for a user (force logout).
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
        models.RefreshToken.is_active == True
    ).all()
    
    count = 0
    for session in sessions:
        session.is_active = False
        count += 1
    
    db.commit()
    
    logger.warning(
        f"Admin {admin_user.email} revoked {count} sessions for user {user.email}",
        extra={
            "admin_id": admin_user.id,
            "target_user_id": user_id,
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


@router.get("/{user_id}/applications", response_model=list[dto.UserApplicationDTO])
def get_user_applications(
    user_id: int,
    limit: int = 50,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get user's applications.
    
    Returns list of user's job applications.
    """
    # Verify user exists
    user = service.get_user_detail(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return service.get_user_applications(user_id, limit)


@router.get("/{user_id}/jobs", response_model=list[dto.UserJobDTO])
def get_user_jobs(
    user_id: int,
    limit: int = 50,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get user's saved jobs.
    
    Returns list of user's saved job postings.
    """
    # Verify user exists
    user = service.get_user_detail(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return service.get_user_jobs(user_id, limit)


@router.get("/{user_id}/activity", response_model=list[dto.ActivityEventDTO])
def get_user_activity(
    user_id: int,
    limit: int = 50,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get user's recent activity.
    
    Returns user's recent actions from application logs.
    """
    # Verify user exists
    user = service.get_user_detail(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return service.get_user_activity(user_id, limit)
