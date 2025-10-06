from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone

from ...db.session import get_db
from ...db import models
from ...api.deps_auth import get_current_user
from ...api.schemas.preferences import PreferenceCreate, PreferenceUpdate, PreferenceOut
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/preferences", tags=["preferences"])
logger = get_logger(__name__)

@router.get("", response_model=List[PreferenceOut])
def get_user_preferences(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        logger.debug("Getting user preferences", extra={"user_id": current_user.id})
        stmt = select(models.UserPreferences).where(models.UserPreferences.user_id == current_user.id)
        preferences = db.execute(stmt).scalars().all()
        logger.debug("Preferences retrieved", extra={
            "user_id": current_user.id,
            "count": len(preferences)
        })
        return [PreferenceOut(preference_key=p.preference_key, preference_value=p.preference_value) for p in preferences]
    except Exception as e:
        logger.error("Failed to get user preferences", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve preferences")

@router.get("/{preference_key}", response_model=PreferenceOut)
def get_user_preference(preference_key: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == preference_key
    )
    preference = db.execute(stmt).scalar_one_or_none()
    if not preference:
        return PreferenceOut(preference_key=preference_key, preference_value={})
    return PreferenceOut(preference_key=preference.preference_key, preference_value=preference.preference_value)

@router.post("", response_model=PreferenceOut)
def create_or_update_preference(
    payload: PreferenceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        logger.debug("Creating/updating preference", extra={
            "user_id": current_user.id,
            "preference_key": payload.preference_key
        })
        
        stmt = select(models.UserPreferences).where(
            models.UserPreferences.user_id == current_user.id,
            models.UserPreferences.preference_key == payload.preference_key
        )
        existing_pref = db.execute(stmt).scalar_one_or_none()
        if existing_pref:
            existing_pref.preference_value = payload.preference_value
            existing_pref.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_pref)
            logger.info("Preference updated", extra={
                "user_id": current_user.id,
                "preference_key": payload.preference_key
            })
            return PreferenceOut(preference_key=existing_pref.preference_key, preference_value=existing_pref.preference_value)
        else:
            new_pref = models.UserPreferences(
                user_id=current_user.id,
                preference_key=payload.preference_key,
                preference_value=payload.preference_value
            )
            db.add(new_pref)
            db.commit()
            db.refresh(new_pref)
            logger.info("Preference created", extra={
                "user_id": current_user.id,
                "preference_key": payload.preference_key
            })
            return PreferenceOut(preference_key=new_pref.preference_key, preference_value=new_pref.preference_value)
    except Exception as e:
        db.rollback()
        logger.error("Failed to create/update preference", extra={
            "user_id": current_user.id,
            "preference_key": payload.preference_key,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save preference")

@router.put("/{preference_key}", response_model=PreferenceOut)
def update_preference(
    preference_key: str,
    payload: PreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == preference_key
    )
    preference = db.execute(stmt).scalar_one_or_none()
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    preference.preference_value = payload.preference_value
    preference.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(preference)
    return PreferenceOut(preference_key=preference.preference_key, preference_value=preference.preference_value)

@router.delete("/{preference_key}")
def delete_preference(
    preference_key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        logger.info("Deleting preference", extra={
            "user_id": current_user.id,
            "preference_key": preference_key
        })
        
        stmt = select(models.UserPreferences).where(
            models.UserPreferences.user_id == current_user.id,
            models.UserPreferences.preference_key == preference_key
        )
        preference = db.execute(stmt).scalar_one_or_none()
        if not preference:
            logger.warning("Preference not found for deletion", extra={
                "user_id": current_user.id,
                "preference_key": preference_key
            })
            raise HTTPException(status_code=404, detail="Preference not found")
        
        db.delete(preference)
        db.commit()
        
        logger.info("Preference deleted", extra={
            "user_id": current_user.id,
            "preference_key": preference_key
        })
        return {"message": "Preference deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("Failed to delete preference", extra={
            "user_id": current_user.id,
            "preference_key": preference_key,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete preference")
