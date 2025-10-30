"""
Admin User Management - Core CRUD Operations

Handles basic user management operations:
- List users with filtering and search
- Get individual user details
- Delete user accounts

All endpoints require admin authentication.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto
from app.infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """
    Dependency function to inject AdminService instance.
    
    Creates and returns an AdminService instance with the current
    database session. Used as a FastAPI dependency for all user
    management endpoints.
    
    Args:
        db: Database session (from get_db dependency)
        
    Returns:
        AdminService: Service instance for admin operations
    """
    return AdminService(db)


@router.get("/", response_model=dto.PaginatedUsersDTO)
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
    Retrieve paginated list of users with advanced filtering and search.
    
    Provides comprehensive user listing with multiple filter options.
    Essential for user management, support operations, and analytics.
    
    Query Parameters:
        page (int): Page number, starting from 1 (default: 1)
        page_size (int): Items per page, range 1-100 (default: 20)
        search (str): Search by email or location (partial match)
        role (str): Filter by role - "user" or "admin"
        is_premium (bool): Filter by premium status - true/false
        email_verified (bool): Filter by email verification status - true/false
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: AdminService instance (from dependency)
        
    Returns:
        PaginatedUsersDTO: Paginated list containing:
            - items: List of UserSummaryDTO objects with:
                - id: User UUID
                - email: User email address
                - full_name: User's full name (if provided)
                - role: User role (user/admin)
                - is_premium: Premium account status
                - email_verified: Email verification status
                - created_at: Registration timestamp
                - last_login_at: Last login timestamp
            - total: Total count of matching users
            - page: Current page number
            - page_size: Items per page
            - total_pages: Total pages available
            
    Raises:
        HTTPException: 500 if users cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Search is case-insensitive and matches email or location
        - Page size is automatically capped at 100
        - Invalid pagination parameters are auto-corrected
        - Results are ordered by created_at desc (newest first)
        - Use filters for targeted user management
        
    Example:
        GET /api/admin/users?search=example&is_premium=true&page=1&page_size=50
        Returns premium users with "example" in email/location
    """
    try:
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100
        
        logger.debug(
            "Admin listing users",
            extra={
                "admin_id": str(admin_user.id),
                "page": page,
                "page_size": page_size,
                "filters": {
                    "search": search,
                    "role": role,
                    "is_premium": is_premium,
                    "email_verified": email_verified
                }
            }
        )
        
        result = service.get_users(
            page=page,
            page_size=page_size,
            search=search,
            role=role,
            is_premium=is_premium,
            email_verified=email_verified
        )
        
        logger.info(
            "Users list retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_users": result.total,
                "returned_count": len(result.items)
            }
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "Error listing users",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve users list"
        )


@router.get("/{user_id}", response_model=dto.UserDetailDTO)
def get_user(
    user_id: uuid.UUID,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve comprehensive details about a specific user.
    
    Returns full user profile including statistics and metadata.
    Essential for user support, account verification, and investigation.
    
    Path Parameters:
        user_id (UUID): ID of the user to retrieve
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: AdminService instance (from dependency)
        
    Returns:
        UserDetailDTO: Detailed user object containing:
            - id: User UUID
            - email: User email address
            - full_name: User's full name
            - role: User role (user/admin)
            - is_premium: Premium account status
            - email_verified: Email verification status
            - avatar_url: Profile picture URL (if set)
            - location: User location (if provided)
            - created_at: Registration timestamp
            - last_login_at: Last login timestamp
            - statistics:
                - applications_count: Total job applications
                - jobs_count: Total saved jobs
                - documents_count: Total uploaded documents
                - activity_count: Total activity events
                
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if details cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Includes aggregated statistics for quick overview
        - Use for support tickets, account issues, fraud investigation
        - Statistics are counted from related tables
        - Avatar URL may be null if user hasn't uploaded photo
        
    Example:
        GET /api/admin/users/123e4567-e89b-12d3-a456-426614174000
        Returns full details for the specified user
    """
    try:
        logger.debug(
            "Admin fetching user detail",
            extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id)}
        )
        
        user = service.get_user_detail(user_id)
        if not user:
            logger.warning(
                "User not found",
                extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id)}
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(
            "User detail retrieved",
            extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id)}
        )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching user detail",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch user details"
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: uuid.UUID,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user account and all associated data.
    
    ⚠️ CRITICAL OPERATION - This action is permanent and cannot be undone!
    
    Removes the user and all their associated data from the system.
    This is a destructive operation that should only be used for:
    - GDPR/privacy compliance (right to be forgotten)
    - Account termination for policy violations
    - Fraud/abuse mitigation
    
    Path Parameters:
        user_id (UUID): ID of the user to delete
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Operation result containing:
            - success (bool): True if deletion succeeded
            - message (str): Confirmation message with user email
            - user_id (UUID): ID of deleted user
            
    Raises:
        HTTPException: 400 if attempting self-deletion
        HTTPException: 404 if user not found
        HTTPException: 500 if deletion fails
        
    Security:
        Requires admin role authentication
        Logs CRITICAL-level event (destructive operation)
        Prevents admins from deleting themselves
        
    Notes:
        - Deletion is permanent and cascades to related data
        - All user data is removed: applications, jobs, documents, sessions
        - Consider soft-delete/deactivation for data retention requirements
        - Admins cannot delete their own account (prevents lockout)
        - Operation is logged with admin and target user details
        - Use only when absolutely necessary
        
    Example:
        DELETE /api/admin/users/123e4567-e89b-12d3-a456-426614174000
        Permanently deletes the user and all their data
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
