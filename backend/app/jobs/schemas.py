from pydantic import BaseModel, HttpUrl
from typing import Optional
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

class JobOut(BaseModel):
    id: uuid.UUID
    title: str
    company_id: Optional[uuid.UUID] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    source_url: Optional[str] = None

    class Config:
        from_attributes = True

class ScrapeIn(BaseModel):
    url: HttpUrl
