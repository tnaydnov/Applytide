from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from uuid import UUID

@dataclass
class JobDTO:
    id: UUID
    title: str
    company_id: Optional[UUID]
    company_name: Optional[str]
    website: Optional[str]
    location: Optional[str]
    remote_type: Optional[str]
    job_type: Optional[str]
    description: Optional[str]
    requirements: List[str]
    skills: List[str]
    source_url: Optional[str]
    created_at: datetime

@dataclass
class JobSearchDTO:
    id: str
    title: str
    description: Optional[str]
    location: Optional[str]
    remote_type: Optional[str]
    source_url: Optional[str]
    created_at: str
    company_name: Optional[str]
    company_website: Optional[str]
    relevance_score: float
