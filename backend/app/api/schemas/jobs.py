from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field, HttpUrl

class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    company_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = Field(None, max_length=300)
    website: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=500)
    remote_type: Optional[str] = Field(None, max_length=50)
    job_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=100000)
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    source_url: Optional[str] = Field(None, max_length=2000)

class ManualJobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    company_name: str = Field(..., min_length=1, max_length=300)
    location: Optional[str] = Field(None, max_length=500)
    remote_type: Optional[str] = Field("On-site", max_length=50)
    job_type: Optional[str] = Field("Full-time", max_length=50)
    experience_level: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=100000)
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    source_url: Optional[str] = Field(None, max_length=2000)

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
    is_archived: bool = False
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
