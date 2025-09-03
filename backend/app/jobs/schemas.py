from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
import uuid

class JobCreate(BaseModel):
    title: str
    company_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None   # if no existing company, create one
    website: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    source_url: Optional[str] = None

class ManualJobCreate(BaseModel):
    """Schema for manually creating jobs (non-premium users)"""
    title: str
    company_name: str
    location: Optional[str] = None
    remote_type: Optional[str] = "On-site"  # Default to On-site
    job_type: Optional[str] = "Full-time"  # Default to Full-time
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None  # Changed from [] to None
    skills: Optional[List[str]] = None  # Changed from [] to None
    benefits: Optional[List[str]] = None  # Changed from [] to None
    source_url: Optional[str] = None

    class Config:
        # Allow extra fields to be ignored instead of raising validation errors
        extra = "ignore"

class JobOut(BaseModel):
    id: uuid.UUID
    title: str
    company_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class JobSearchOut(BaseModel):
    """Job search result with relevance scoring"""
    id: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    source_url: Optional[str] = None
    created_at: str
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    relevance_score: float

class ScrapeIn(BaseModel):
    url: HttpUrl
