"""
Profile API Schemas
All Pydantic models for profile-related requests and responses
"""
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime


class LocationRequest(BaseModel):
    """Location preferences request model."""
    preferred_locations: List[str]
    country: str
    remote_preference: str


class CareerRequest(BaseModel):
    """Career preferences request model."""
    target_roles: List[str]
    target_industries: List[str]
    experience_level: str
    career_goals: List[str]


class SkillsRequest(BaseModel):
    """Skills request model."""
    skills: List[str]


class ProfileRequest(BaseModel):
    """Complete profile update/creation request."""
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
        """Convert None or empty strings to empty lists."""
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
        """Convert empty strings to None."""
        return v if v is not None and v != '' else None


class ProfileResponse(BaseModel):
    """Profile response model."""
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


class WelcomeModalStatusResponse(BaseModel):
    """Welcome modal status response."""
    has_seen_welcome_modal: bool
    welcome_modal_seen_at: Optional[datetime] = None
