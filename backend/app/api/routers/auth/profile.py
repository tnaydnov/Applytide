"""User profile management endpoints."""
from __future__ import annotations
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....api.deps_auth import get_current_user
from ....api.schemas import auth as schemas
from ....infra.logging import get_logger

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)


@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """Get current authenticated user information."""
    try:
        logger.debug(
            "User info requested",
            extra={"user_id": str(current_user.id)}
        )
        
        return {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "avatar_url": current_user.avatar_url or current_user.google_avatar_url,
            "bio": current_user.bio,
            "phone": current_user.phone,
            "location": current_user.location,
            "timezone": current_user.timezone,
            "website": current_user.website,
            "linkedin_url": current_user.linkedin_url,
            "github_url": current_user.github_url,
            "language": current_user.language,
            "theme_preference": current_user.theme_preference,
            "notification_email": current_user.notification_email,
            "notification_push": current_user.notification_push,
            "is_premium": getattr(current_user, 'is_premium', False),
            "premium_expires_at": current_user.premium_expires_at.isoformat() if getattr(current_user, 'premium_expires_at', None) else None,
            "created_at": current_user.created_at.isoformat(),
            "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
            "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
            "email_verified": bool(current_user.email_verified_at),
            "is_oauth_user": current_user.is_oauth_user,
            "google_id": current_user.google_id,
            "role": getattr(current_user, 'role', 'user')
        }
    except Exception as e:
        logger.error(
            "Failed to retrieve user info",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )


@router.put("/profile", response_model=schemas.MessageResponse)
def update_profile(payload: schemas.ProfileUpdateIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user profile information."""
    try:
        logger.info(
            "Profile update requested",
            extra={"user_id": str(current_user.id)}
        )
        
        updated_fields = []
        if payload.full_name is not None:
            current_user.full_name = payload.full_name
            updated_fields.append("full_name")
        if payload.first_name is not None:
            current_user.first_name = payload.first_name
            updated_fields.append("first_name")
        if payload.last_name is not None:
            current_user.last_name = payload.last_name
            updated_fields.append("last_name")
        if payload.bio is not None:
            current_user.bio = payload.bio
            updated_fields.append("bio")
        if payload.phone is not None:
            current_user.phone = payload.phone
            updated_fields.append("phone")
        if payload.location is not None:
            current_user.location = payload.location
            updated_fields.append("location")
        if payload.timezone is not None:
            current_user.timezone = payload.timezone
            updated_fields.append("timezone")
        if payload.website is not None:
            current_user.website = payload.website
            updated_fields.append("website")
        if payload.linkedin_url is not None:
            current_user.linkedin_url = payload.linkedin_url
            updated_fields.append("linkedin_url")
        if payload.github_url is not None:
            current_user.github_url = payload.github_url
            updated_fields.append("github_url")
        
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(
            "Profile updated successfully",
            extra={
                "user_id": str(current_user.id),
                "updated_fields": updated_fields
            }
        )
        
        return schemas.MessageResponse(message="Profile updated successfully")
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to update profile",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.put("/preferences", response_model=schemas.MessageResponse)
def update_preferences(payload: schemas.PreferencesUpdateIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user preferences."""
    try:
        logger.info(
            "Preferences update requested",
            extra={"user_id": str(current_user.id)}
        )
        
        updated_fields = []
        if payload.language is not None:
            current_user.language = payload.language
            updated_fields.append("language")
        if payload.theme_preference is not None:
            current_user.theme_preference = payload.theme_preference
            updated_fields.append("theme_preference")
        if payload.notification_email is not None:
            current_user.notification_email = payload.notification_email
            updated_fields.append("notification_email")
        if payload.notification_push is not None:
            current_user.notification_push = payload.notification_push
            updated_fields.append("notification_push")
        
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(
            "Preferences updated successfully",
            extra={
                "user_id": str(current_user.id),
                "updated_fields": updated_fields
            }
        )
        
        return schemas.MessageResponse(message="Preferences updated successfully")
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to update preferences",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences"
        )
