"""
User Profile API Router
Handles user profile creation, updates, and retrieval for personalization
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ValidationError, field_validator
import json

from app.db.session import get_db
from app.api.deps_auth import get_current_user
from app.db.models import User, UserProfile

router = APIRouter(prefix="/api/profile", tags=["User Profile"])

# Pydantic models for request/response
class LocationRequest(BaseModel):
    preferred_locations: List[str]
    country: str
    remote_preference: str

class CareerRequest(BaseModel):
    target_roles: List[str]
    target_industries: List[str]
    experience_level: str
    career_goals: List[str]

class SkillsRequest(BaseModel):
    skills: List[str]

class ProfileRequest(BaseModel):
    # Location data
    preferred_locations: List[str] = []
    current_location: Optional[str] = ""
    country: Optional[str] = ""
    remote_preference: Optional[str] = ""
    # Career data
    target_roles: List[str] = []
    target_industries: List[str] = []
    experience_level: Optional[str] = ""
    career_goals: List[str] = []
    # Skills and compensation
    core_skills: List[str] = []
    learning_goals: List[str] = []
    years_experience: Optional[str] = ""
    job_search_status: Optional[str] = ""
    availability: Optional[str] = ""
    currency: Optional[str] = ""

    @field_validator(
        'preferred_locations', 'target_roles', 'target_industries',
        'career_goals', 'core_skills', 'learning_goals',
        mode='before'
    )
    @classmethod
    def handle_empty_lists(cls, v):
        if v is None or v == '':
            return []
        return v if isinstance(v, list) else [v]

    @field_validator(
        'current_location', 'country', 'remote_preference',
        'experience_level', 'years_experience', 'job_search_status',
        'availability', 'currency', mode='before'
    )
    @classmethod
    def handle_empty_strings(cls, v):
        return v if v is not None and v != '' else None

class ProfileResponse(BaseModel):
    id: str
    user_id: str
    preferred_locations: Optional[List[str]]
    country: Optional[str]
    remote_preference: Optional[str]
    target_roles: Optional[List[str]]
    target_industries: Optional[List[str]]
    experience_level: Optional[str]
    skills: Optional[List[str]]
    career_goals: Optional[List[str]]

    class Config:
        from_attributes = True

@router.get("/")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {
            "id": "",
            "user_id": str(current_user.id),
            "preferred_locations": [],
            "country": "",
            "remote_preference": "",
            "target_roles": [],
            "target_industries": [],
            "experience_level": "",
            "career_goals": [],
            "skills": []
        }
    return profile

@router.put("/")
async def update_user_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update user profile"""
    try:
        body = await request.body()
        raw_data = json.loads(body.decode())

        profile_data = ProfileRequest(**raw_data)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=f"Validation error: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {e}")

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if profile:
        profile.preferred_locations = profile_data.preferred_locations
        profile.country = profile_data.country
        profile.remote_preference = profile_data.remote_preference
        profile.target_roles = profile_data.target_roles
        profile.target_industries = profile_data.target_industries
        profile.experience_level = profile_data.experience_level
        profile.skills = profile_data.core_skills
        profile.career_goals = profile_data.career_goals
    else:
        profile = UserProfile(
            user_id=current_user.id,
            preferred_locations=profile_data.preferred_locations,
            country=profile_data.country,
            remote_preference=profile_data.remote_preference,
            target_roles=profile_data.target_roles,
            target_industries=profile_data.target_industries,
            experience_level=profile_data.experience_level,
            skills=profile_data.core_skills,
            career_goals=profile_data.career_goals
        )
        db.add(profile)

    try:
        db.commit()
        db.refresh(profile)
        return profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile: {str(e)}"
        )

@router.get("/completeness")
async def get_profile_completeness(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if profile is complete enough for AI dashboard access"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"is_complete": False, "completeness_percentage": 0, "message": "Profile setup required"}

    required_fields = [
        profile.preferred_locations,
        profile.country,
        profile.remote_preference,
        profile.experience_level
    ]
    completed_count = sum(1 for field in required_fields if field)
    completeness_percentage = (completed_count / len(required_fields)) * 100
    is_complete = completeness_percentage >= 75

    return {
        "is_complete": is_complete,
        "completeness_percentage": int(completeness_percentage),
        "message": "Profile complete" if is_complete else "Please complete your profile setup"
    }

@router.get("/job-preferences")
async def get_job_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Placeholder: job preferences derived from main profile."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"preferences": {}}
    return {
        "company_size": [],
        "company_stage": [],
        "company_culture": [],
        "team_size": "medium",
        "management_interest": False
    }

@router.put("/job-preferences")
async def update_job_preferences(
    preferences: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Placeholder: not persisted."""
    return {"message": "Job preferences updated successfully"}

@router.get("/career-goals")
async def get_career_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"goals": []}
    return {"short_term_goals": profile.career_goals or [], "long_term_goals": [], "career_path": "technical_leadership"}

@router.put("/career-goals")
async def update_career_goals(
    goals: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Placeholder: not persisted."""
    return {"message": "Career goals updated successfully"}

@router.delete("/")
async def delete_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted successfully"}
