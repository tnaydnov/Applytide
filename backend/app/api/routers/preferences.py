"""
User Preferences Management Router

This module provides key-value storage for user preferences and settings across Applytide.
Supports storing arbitrary JSON data under named keys for flexible configuration management.

Key Features:
- Key-value preference storage with JSON values
- Create, read, update, delete operations
- Per-user preference isolation
- Flexible schema (any JSON structure supported)

Common Use Cases:
- UI theme preferences (dark/light mode)
- Notification settings
- Dashboard layout configuration
- Feature flags per user
- Custom field visibility settings

Dependencies:
- SQLAlchemy for database operations
- User authentication for data isolation

Router: /api/preferences
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone

from ...db.session import get_db
from ...db import models
from ...api.deps import get_current_user
from ...api.schemas.preferences import PreferenceCreate, PreferenceUpdate, PreferenceOut
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/preferences", tags=["preferences"])
logger = get_logger(__name__)

@router.get("", response_model=List[PreferenceOut])
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get all preferences for the current user.
    
    Retrieves all key-value preference pairs stored for the authenticated user.
    Returns empty list if no preferences set.
    
    Args:
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        List[PreferenceOut]: All user preferences (key-value pairs)
    
    Raises:
        HTTPException: 500 if database query fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only sees their own preferences
        - Automatic filtering by user_id
    
    Notes:
        - Returns empty list if no preferences stored
        - Each preference includes key and JSON value
        - No pagination (preferences typically small dataset)
        - Useful for bulk loading user settings on app init
    
    Example:
        GET /api/preferences
        Response:
        [
            {"preference_key": "theme", "preference_value": {"mode": "dark"}},
            {"preference_key": "notifications", "preference_value": {"email": true}}
        ]
    """
    try:
        logger.debug("Getting user preferences", extra={"user_id": current_user.id})
        stmt = select(models.UserPreferences).where(
            models.UserPreferences.user_id == current_user.id
        )
        preferences = db.execute(stmt).scalars().all()
        logger.debug(
            "Preferences retrieved",
            extra={"user_id": current_user.id, "count": len(preferences)},
        )
        return [
            PreferenceOut(
                preference_key=p.preference_key,
                preference_value=p.preference_value,
            )
            for p in preferences
        ]
    except Exception as e:
        logger.error(
            "Failed to get user preferences",
            extra={"user_id": current_user.id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve preferences")


@router.get("/{preference_key}", response_model=PreferenceOut)
def get_user_preference(
    preference_key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get a specific preference by key.
    
    Retrieves the value of a single preference by its key. Returns empty object
    if preference not found (graceful handling).
    
    Path Parameters:
        - preference_key: Unique key identifying the preference
    
    Args:
        preference_key: Preference key to retrieve
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        PreferenceOut: Preference with key and JSON value (or empty object if not found)
    
    Raises:
        HTTPException: 500 if database query fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only access their own preferences
        - Ownership filtering by user_id
    
    Notes:
        - Returns {"preference_key": key, "preference_value": {}} if not found
        - No 404 error (graceful default handling)
        - Case-sensitive key matching
        - Useful for checking specific setting existence
    
    Example:
        GET /api/preferences/theme
        Response:
        {
            "preference_key": "theme",
            "preference_value": {"mode": "dark", "accent": "#3b82f6"}
        }
    """
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == preference_key,
    )
    preference = db.execute(stmt).scalar_one_or_none()
    if not preference:
        return PreferenceOut(preference_key=preference_key, preference_value={})
    return PreferenceOut(
        preference_key=preference.preference_key,
        preference_value=preference.preference_value,
    )

@router.post("", response_model=PreferenceOut)
def create_or_update_preference(
    payload: PreferenceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create or update a preference (upsert).
    
    Creates a new preference or updates existing one if key already exists.
    Flexible upsert operation for easy preference management.
    
    Request Body:
        PreferenceCreate with:
        - preference_key: Unique key (required)
        - preference_value: JSON value (any structure, required)
    
    Args:
        payload: Preference data to create/update
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        PreferenceOut: Created or updated preference
    
    Raises:
        HTTPException: 400 if validation fails (invalid JSON)
        HTTPException: 500 if database operation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Preference automatically linked to current user
        - User cannot modify other users' preferences
    
    Notes:
        - Upsert operation (creates if missing, updates if exists)
        - Accepts any valid JSON structure as value
        - Updated_at timestamp automatically set on update
        - Transaction rolled back on error
        - Logs creation vs update for analytics
    
    Example:
        POST /api/preferences
        Request:
        {
            "preference_key": "dashboard_layout",
            "preference_value": {
                "sidebar_collapsed": false,
                "widgets": ["applications", "reminders", "analytics"]
            }
        }
        Response: PreferenceOut object
    """
    try:
        logger.debug(
            "Creating/updating preference",
            extra={
                "user_id": current_user.id,
                "preference_key": payload.preference_key,
            },
        )

        stmt = select(models.UserPreferences).where(
            models.UserPreferences.user_id == current_user.id,
            models.UserPreferences.preference_key == payload.preference_key,
        )
        existing_pref = db.execute(stmt).scalar_one_or_none()
        if existing_pref:
            existing_pref.preference_value = payload.preference_value
            existing_pref.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_pref)
            logger.info(
                "Preference updated",
                extra={
                    "user_id": current_user.id,
                    "preference_key": payload.preference_key,
                },
            )
            return PreferenceOut(
                preference_key=existing_pref.preference_key,
                preference_value=existing_pref.preference_value,
            )
        else:
            new_pref = models.UserPreferences(
                user_id=current_user.id,
                preference_key=payload.preference_key,
                preference_value=payload.preference_value,
            )
            db.add(new_pref)
            db.commit()
            db.refresh(new_pref)
            logger.info(
                "Preference created",
                extra={
                    "user_id": current_user.id,
                    "preference_key": payload.preference_key,
                },
            )
            return PreferenceOut(
                preference_key=new_pref.preference_key,
                preference_value=new_pref.preference_value,
            )
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to create/update preference",
            extra={
                "user_id": current_user.id,
                "preference_key": payload.preference_key,
                "error": str(e),
            },
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to save preference")


@router.put("/{preference_key}", response_model=PreferenceOut)
def update_preference(
    preference_key: str,
    payload: PreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Update an existing preference (strict update).
    
    Updates the value of an existing preference. Requires preference to already
    exist (returns 404 if not found). Use POST for upsert behavior.
    
    Path Parameters:
        - preference_key: Unique key identifying the preference
    
    Request Body:
        PreferenceUpdate with:
        - preference_value: New JSON value (any structure, required)
    
    Args:
        preference_key: Preference key to update
        payload: New preference value
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        PreferenceOut: Updated preference
    
    Raises:
        HTTPException: 404 if preference not found
        HTTPException: 400 if validation fails
        HTTPException: 500 if update fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own preferences
        - Ownership filtering by user_id
    
    Notes:
        - Strict update (404 if not exists) - use POST for upsert
        - Complete replacement of preference_value
        - Updated_at timestamp automatically set
        - Case-sensitive key matching
    
    Example:
        PUT /api/preferences/theme
        Request:
        {
            "preference_value": {"mode": "light", "accent": "#10b981"}
        }
        Response: Updated PreferenceOut object
    """
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == preference_key,
    )
    preference = db.execute(stmt).scalar_one_or_none()
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    preference.preference_value = payload.preference_value
    preference.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(preference)
    return PreferenceOut(
        preference_key=preference.preference_key,
        preference_value=preference.preference_value,
    )


@router.delete("/{preference_key}")
def delete_preference(
    preference_key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delete a preference.
    
    Permanently deletes a preference by key. This operation is irreversible.
    
    Path Parameters:
        - preference_key: Unique key identifying the preference to delete
    
    Args:
        preference_key: Preference key to delete
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException: 404 if preference not found
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only delete their own preferences
        - Ownership filtering by user_id
    
    Notes:
        - Permanent deletion (no recovery)
        - Returns 404 if preference doesn't exist
        - Transaction rolled back on error
        - Logs deletion for audit trail
        - Useful for resetting specific settings to defaults
    
    Example:
        DELETE /api/preferences/experimental_features
        Response: {"message": "Preference deleted successfully"}
    """
    try:
        logger.info(
            "Deleting preference",
            extra={"user_id": current_user.id, "preference_key": preference_key},
        )

        stmt = select(models.UserPreferences).where(
            models.UserPreferences.user_id == current_user.id,
            models.UserPreferences.preference_key == preference_key,
        )
        preference = db.execute(stmt).scalar_one_or_none()
        if not preference:
            logger.warning(
                "Preference not found for deletion",
                extra={"user_id": current_user.id, "preference_key": preference_key},
            )
            raise HTTPException(status_code=404, detail="Preference not found")

        db.delete(preference)
        db.commit()

        logger.info(
            "Preference deleted",
            extra={"user_id": current_user.id, "preference_key": preference_key},
        )
        return {"message": "Preference deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to delete preference",
            extra={
                "user_id": current_user.id,
                "preference_key": preference_key,
                "error": str(e),
            },
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to delete preference")
