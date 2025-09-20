"""
User Profile API Router
Handles user profile creation, updates, and retrieval for personalization
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ValidationError, field_validator
import json

from ..db.session import get_db
from ..models.user_profile import UserProfile
from ..auth.deps import get_current_user
from ..db.models import User

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
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None

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
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    currency: Optional[str] = ""
    
    @field_validator('min_salary', 'max_salary', mode='before')
    @classmethod
    def convert_empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return None
        return v
    
    @field_validator('preferred_locations', 'target_roles', 'target_industries', 'career_goals', 'core_skills', 'learning_goals', mode='before')
    @classmethod
    def handle_empty_lists(cls, v):
        if v is None or v == '':
            return []
        return v if isinstance(v, list) else [v]
    
    @field_validator('current_location', 'country', 'remote_preference', 'experience_level', 'years_experience', 'job_search_status', 'availability', 'currency', mode='before')
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
    min_salary: Optional[int]
    max_salary: Optional[int]
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
        # Return empty profile structure for new users
        return {
            "id": "",  # Empty string instead of None
            "user_id": str(current_user.id),
            "preferred_locations": [],
            "country": "",
            "remote_preference": "",
            "target_roles": [],
            "target_industries": [],
            "experience_level": "",
            "career_goals": [],
            "skills": [],
            "min_salary": None,
            "max_salary": None
        }
    
    return profile

@router.put("/")
async def update_user_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update user profile"""
    
    # Get raw request body for debugging
    try:
        body = await request.body()
        raw_data = json.loads(body.decode())
        print(f"=== PROFILE UPDATE DEBUG ===")
        print(f"User ID: {current_user.id}")
        print(f"Raw request data: {raw_data}")
        
        # Try to validate the data manually
        profile_data = ProfileRequest(**raw_data)
        print(f"Parsed profile data: {profile_data.model_dump()}")
        print(f"Core skills: {profile_data.core_skills}")
        print(f"=== VALIDATION SUCCESS ===")
        
    except ValidationError as e:
        print(f"VALIDATION ERROR: {e}")
        raise HTTPException(status_code=422, detail=f"Validation error: {e}")
    except Exception as e:
        print(f"OTHER ERROR: {e}")
        raise HTTPException(status_code=400, detail=f"Error: {e}")
    
    # Check if profile exists
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    print(f"Existing profile found: {profile is not None}")
    
    if profile:
        print("Updating existing profile...")
        # Update existing profile
        profile.preferred_locations = profile_data.preferred_locations
        profile.country = profile_data.country
        profile.remote_preference = profile_data.remote_preference
        profile.target_roles = profile_data.target_roles
        profile.target_industries = profile_data.target_industries
        profile.experience_level = profile_data.experience_level
        profile.skills = profile_data.core_skills  # Fix: core_skills -> skills
        profile.min_salary = profile_data.min_salary
        profile.max_salary = profile_data.max_salary
        profile.career_goals = profile_data.career_goals
        print("Profile fields updated")
    else:
        print("Creating new profile...")
        # Create new profile
        profile = UserProfile(
            user_id=current_user.id,
            preferred_locations=profile_data.preferred_locations,
            country=profile_data.country,
            remote_preference=profile_data.remote_preference,
            target_roles=profile_data.target_roles,
            target_industries=profile_data.target_industries,
            experience_level=profile_data.experience_level,
            skills=profile_data.core_skills,  # Fix: core_skills -> skills
            min_salary=profile_data.min_salary,
            max_salary=profile_data.max_salary,
            career_goals=profile_data.career_goals
        )
        db.add(profile)
        print("New profile created and added to session")
    
    try:
        print("Committing to database...")
        db.commit()
        print("Database commit successful")
        db.refresh(profile)
        print("Profile refresh successful")
        print(f"=== PROFILE UPDATE COMPLETE ===")
        return profile
    except Exception as e:
        print(f"DATABASE ERROR: {e}")
        db.rollback()
        print("Database rollback completed")
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
        return {
            "is_complete": False,
            "completeness_percentage": 0,
            "message": "Profile setup required"
        }
    
    # Check if profile has minimum required fields for AI analysis
    required_fields = [
        profile.preferred_locations,
        profile.country,
        profile.remote_preference,
        profile.experience_level
    ]
    
    completed_count = sum(1 for field in required_fields if field)
    completeness_percentage = (completed_count / len(required_fields)) * 100
    
    is_complete = completeness_percentage >= 75  # At least 75% complete
    
    return {
        "is_complete": is_complete,
        "completeness_percentage": int(completeness_percentage),
        "message": "Profile complete" if is_complete else "Please complete your profile setup"
    }
        
    if profile.experience_level:
        completed_fields += 1
    else:
        missing_fields.append("experience_level")
        
    if profile.skills:
        completed_fields += 1
    else:
        missing_fields.append("skills")
        
    if profile.min_salary:
        completed_fields += 1
    else:
        missing_fields.append("min_salary")
        
    if profile.max_salary:
        completed_fields += 1
    else:
        missing_fields.append("max_salary")
        
    if profile.career_goals:
        completed_fields += 1
    else:
        missing_fields.append("career_goals")
    
    completeness = int((completed_fields / total_fields) * 100)
    
    return {
        "completeness": completeness,
        "missing_fields": missing_fields,
        "completed_fields": completed_fields,
        "total_fields": total_fields
    }

@router.get("/job-preferences")
async def get_job_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user job preferences (placeholder - using main profile for now)"""
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
    """Update job preferences (placeholder - not persisted for now)"""
    return {"message": "Job preferences updated successfully"}

@router.get("/career-goals")
async def get_career_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user career goals (using career_goals from main profile)"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        return {"goals": []}
    
    return {
        "short_term_goals": profile.career_goals or [],
        "long_term_goals": [],
        "career_path": "technical_leadership"
    }

@router.put("/career-goals")
async def update_career_goals(
    goals: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update career goals (placeholder - not persisted for now)"""
    return {"message": "Career goals updated successfully"}

@router.delete("/")
async def delete_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    db.delete(profile)
    db.commit()
    
    return {"message": "Profile deleted successfully"}
