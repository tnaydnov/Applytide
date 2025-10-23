"""
Admin-only authentication dependencies.
"""
from fastapi import Depends, HTTPException, status
from app.api.deps_auth import get_current_user
from app.db import models


def get_admin_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """
    Verify that the current user has admin role.
    
    Raises:
        HTTPException: 403 if user is not an admin
        
    Returns:
        User object with admin role
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
