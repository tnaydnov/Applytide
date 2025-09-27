from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, HttpUrl

class JobCreate(BaseModel):
    title: str
    company_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    source_url: Optional[str] = None

class ManualJobCreate(BaseModel):
    title: str
    company_name: str
    location: Optional[str] = None
    remote_type: Optional[str] = "On-site"
    job_type: Optional[str] = "Full-time"
    experience_level: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    source_url: Optional[str] = None

    class Config:
        extra = "ignore"

class JobOut(BaseModel):
    id: uuid.UUID
    title: str
    company_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    source_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class JobSearchOut(BaseModel):
    """Job search result with relevance scoring (comes from the search index)."""
    id: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    source_url: Optional[str] = None
    created_at: str
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    relevance_score: float

class ScrapeIn(BaseModel):
    url: HttpUrl
