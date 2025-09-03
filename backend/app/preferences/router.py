from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from typing import List, Dict, Any
from datetime import datetime, timezone

from ..db.session import get_db
from ..db import models
from ..auth.deps import get_current_user
from ..db.models import User
from .schemas import PreferenceCreate, PreferenceUpdate, PreferenceOut

router = APIRouter(prefix="/preferences", tags=["preferences"])

@router.get("", response_model=List[PreferenceOut])
def get_user_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all preferences for the current user"""
    stmt = select(models.UserPreferences).where(models.UserPreferences.user_id == current_user.id)
    preferences = db.execute(stmt).scalars().all()
    return [PreferenceOut(preference_key=p.preference_key, preference_value=p.preference_value) for p in preferences]

@router.get("/{preference_key}", response_model=PreferenceOut)
def get_user_preference(preference_key: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific preference for the current user"""
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == preference_key
    )
    preference = db.execute(stmt).scalar_one_or_none()
    
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    return PreferenceOut(preference_key=preference.preference_key, preference_value=preference.preference_value)

@router.post("", response_model=PreferenceOut)
def create_or_update_preference(
    payload: PreferenceCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create or update a user preference"""
    # Check if preference already exists
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == payload.preference_key
    )
    existing_pref = db.execute(stmt).scalar_one_or_none()
    
    if existing_pref:
        # Update existing preference
        existing_pref.preference_value = payload.preference_value
        existing_pref.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_pref)
        return PreferenceOut(preference_key=existing_pref.preference_key, preference_value=existing_pref.preference_value)
    else:
        # Create new preference
        new_pref = models.UserPreferences(
            user_id=current_user.id,
            preference_key=payload.preference_key,
            preference_value=payload.preference_value
        )
        db.add(new_pref)
        db.commit()
        db.refresh(new_pref)
        return PreferenceOut(preference_key=new_pref.preference_key, preference_value=new_pref.preference_value)

@router.put("/{preference_key}", response_model=PreferenceOut)
def update_preference(
    preference_key: str,
    payload: PreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing preference"""
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
    current_user: User = Depends(get_current_user)
):
    """Delete a user preference"""
    stmt = select(models.UserPreferences).where(
        models.UserPreferences.user_id == current_user.id,
        models.UserPreferences.preference_key == preference_key
    )
    preference = db.execute(stmt).scalar_one_or_none()
    
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    db.delete(preference)
    db.commit()
    
    return {"message": "Preference deleted successfully"}
