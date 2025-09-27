from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List
from uuid import UUID
from datetime import datetime

@dataclass
class ApplicationDTO:
    id: UUID
    user_id: Optional[UUID]
    job_id: UUID
    resume_id: Optional[UUID]
    status: str
    source: Optional[str]
    created_at: datetime
    updated_at: datetime

@dataclass
class StageDTO:
    id: UUID
    application_id: UUID
    name: str
    scheduled_at: Optional[datetime]
    outcome: Optional[str]
    notes: Optional[str]
    created_at: datetime

@dataclass
class NoteDTO:
    id: UUID
    application_id: UUID
    body: str
    created_at: datetime

@dataclass
class AttachmentDTO:
    id: UUID
    application_id: UUID
    filename: str
    file_size: int
    content_type: str
    file_path: str
    document_type: Optional[str]
    created_at: datetime

# For cards
@dataclass
class CardRowDTO:
    id: UUID
    status: str
    resume_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    job_id: UUID
    title: str
    company_name: Optional[str]

# For detail
@dataclass
class JobTinyDTO:
    id: UUID
    title: str
    company_name: Optional[str]
    company_website: Optional[str]
    location: Optional[str]
    source_url: Optional[str]
    description: Optional[str]
