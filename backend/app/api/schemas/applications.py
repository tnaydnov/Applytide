from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

# ----- Applications -----
class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None
    status: str = Field(default="Applied", min_length=1, max_length=100)
    source: Optional[str] = Field(None, max_length=500)

class ApplicationOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None
    status: str
    source: Optional[str] = None
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ApplicationUpdate(BaseModel):
    status: str = Field(..., min_length=1, max_length=100)
    source: Optional[str] = Field(None, max_length=500)

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
    source: Optional[str] = None
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class StageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    scheduled_at: Optional[datetime] = None
    outcome: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=10000)

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
    body: str = Field(..., min_length=1, max_length=50000)

class NoteUpdate(BaseModel):
    body: str = Field(..., min_length=1, max_length=50000)

class NoteOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ----- Attachments -----
class AttachmentOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    filename: str
    file_size: int
    content_type: str
    created_at: datetime
    document_type: str | None = "other"
    class Config:
        from_attributes = True

class ApplicationDetail(BaseModel):
    application: ApplicationOut
    job: JobDetailMini
    resume_label: Optional[str] = None
    stages: List[StageOut]
    notes: List[NoteOut]
    attachments: List[AttachmentOut] = []

class AttachFromDocumentRequest(BaseModel):
    """Request body for attaching an existing document to an application."""
    document_id: uuid.UUID
    document_type: str = Field(default="other", pattern=r"^(resume|cover_letter|portfolio|certificate|transcript|reference|other)$")

class AttachmentUpload(BaseModel):
    filename: str
    content_type: str

class StageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    scheduled_at: Optional[datetime] = None
    outcome: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=10000)
