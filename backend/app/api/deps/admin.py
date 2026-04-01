"""
Admin Authentication Dependencies Module

Provides authentication and authorization dependencies specifically for admin-only
endpoints. Ensures only users with admin role can access protected resources.

Key Features:
- Role-based access control (RBAC)
- Admin role verification
- Detailed error messages for debugging
- Audit logging for admin access
- Reuses standard authentication flow

Security:
- Requires valid authentication token
- Verifies admin role from database
- Returns 403 Forbidden for non-admin users
- Prevents privilege escalation

Dependencies:
- Standard authentication via get_current_user
- Database models for user role lookup

Usage:
    @router.get("/admin/users")
    def list_users(admin: User = Depends(get_admin_user)):
        # Only accessible to admin users
        return users

Router Pattern:
    admin_router = APIRouter(
        prefix="/admin",
        dependencies=[Depends(get_admin_user)]  # Apply to all routes
    )
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from .auth import get_current_user
from ...db import models
from ...db.session import get_db
from ...domain.admin.service import AdminService
from ...infra.logging import get_logger

logger = get_logger(__name__)


def get_admin_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """
    Verify that the current user has admin role.
    
    Dependency function that ensures only users with admin role can access
    protected endpoints. Builds on standard authentication by adding role check.
    
    Args:
        current_user: Authenticated user from get_current_user dependency
    
    Returns:
        User: User object with verified admin role
    
    Raises:
        HTTPException: 403 Forbidden if user is not an admin
        HTTPException: 401 if authentication fails (from get_current_user)
    
    Security:
        - Inherits authentication from get_current_user
        - Validates role from database (not from token claims)
        - No role manipulation possible
        - Audit trail via logging
    
    Notes:
        - Current valid role value is exactly "admin" (case-sensitive)
        - Role stored in User model, not in JWT
        - Prevents privilege escalation
        - Logs all admin access attempts for security audit
        - Returns descriptive error for debugging
    
    Example:
        @router.delete("/admin/users/{user_id}")
        def delete_user(
            user_id: UUID,
            admin: User = Depends(get_admin_user)
        ):
            # Only admins can execute this
            return delete_user_service(user_id)
    """
    try:
        logger.debug(
            "Checking admin access",
            extra={
                "user_id": str(current_user.id),
                "user_role": current_user.role,
                "user_email": current_user.email
            }
        )
        
        if current_user.role != "admin":
            logger.warning(
                "Admin access denied - insufficient permissions",
                extra={
                    "user_id": str(current_user.id),
                    "user_role": current_user.role,
                    "user_email": current_user.email,
                    "required_role": "admin"
                }
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        logger.info(
            "Admin access granted",
            extra={
                "user_id": str(current_user.id),
                "user_email": current_user.email
            }
        )
        
        return current_user
    
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping
        raise
    except Exception as e:
        logger.error(
            "Error during admin role verification",
            extra={
                "user_id": str(current_user.id) if current_user else None,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify admin permissions"
        )


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """
    Dependency injection for AdminService.

    Args:
        db: Database session from FastAPI dependency

    Returns:
        AdminService: Initialized service instance with database access
    """
    return AdminService(db)
