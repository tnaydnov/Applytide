from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

# ----- Applications -----
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

# ----- Cards / Detail view models -----
class JobMini(BaseModel):
    id: uuid.UUID
    title: str
    company_name: Optional[str] = None

class JobDetailMini(BaseModel):
    id: uuid.UUID
    title: str
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    location: Optional[str] = None
    source_url: Optional[str] = None
    description: Optional[str] = None

class ApplicationCard(BaseModel):
    id: uuid.UUID
    status: str
    job: JobMini
    resume_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

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

class NoteCreate(BaseModel):
    body: str

class NoteOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    body: str
    created_at: datetime
    class Config:
        from_attributes = True

# ----- Attachments -----
class AttachmentOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    filename: str
    file_size: int
    content_type: str
    file_path: str
    created_at: datetime
    class Config:
        from_attributes = True

class ApplicationDetail(BaseModel):
    application: ApplicationOut
    job: JobDetailMini
    resume_label: Optional[str] = None
    stages: List[StageOut]
    notes: List[NoteOut]
    attachments: List[AttachmentOut] = []
