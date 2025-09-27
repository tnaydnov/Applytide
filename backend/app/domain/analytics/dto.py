from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

@dataclass
class ApplicationLiteDTO:
    id: UUID
    user_id: UUID
    job_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    # optional fields for experiments/sources
    source: Optional[str] = None
    resume_id: Optional[UUID] = None
    has_cover_letter: Optional[bool] = None

@dataclass
class StageLiteDTO:
    id: UUID
    application_id: UUID
    name: str
    outcome: Optional[str]
    created_at: datetime

@dataclass
class JobLiteDTO:
    id: UUID
    title: str
    company_id: Optional[UUID]
    created_at: datetime

@dataclass
class CompanyLiteDTO:
    id: UUID
    name: str
    location: Optional[str]
