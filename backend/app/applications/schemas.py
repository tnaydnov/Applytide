from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None
    status: str = Field(default="Applied")

class ApplicationOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None
    status: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ApplicationUpdate(BaseModel):
    status: str

class StageCreate(BaseModel):
    name: str
    scheduled_at: Optional[datetime] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None

class StageOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    name: str
    scheduled_at: Optional[datetime] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
