# backend/app/domain/admin/jobs_dto.py
"""Data transfer objects for admin job management"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class JobSummaryDTO:
    """Summary info for job list in admin"""
    id: UUID
    title: str
    location: Optional[str]
    remote_type: Optional[str]
    job_type: Optional[str]
    source_url: Optional[str]
    user_id: Optional[UUID]
    company_id: Optional[UUID]
    created_at: datetime
    # Computed stats
    total_applications: int = 0
    company_name: Optional[str] = None


@dataclass
class JobDetailDTO:
    """Detailed job info for admin inspection"""
    id: UUID
    title: str
    location: Optional[str]
    remote_type: Optional[str]
    job_type: Optional[str]
    description: Optional[str]
    requirements: list[str]
    skills: list[str]
    source_url: Optional[str]
    user_id: Optional[UUID]
    company_id: Optional[UUID]
    created_at: datetime
    # Related data
    total_applications: int = 0
    company_name: Optional[str] = None
    applications: list = None


@dataclass
class JobAnalyticsDTO:
    """Analytics data for job management"""
    total_jobs: int
    jobs_7d: int
    jobs_30d: int
    jobs_with_applications: int
    avg_applications_per_job: float
    top_locations: list[dict]  # [{"location": "Remote", "count": 100}]
    top_remote_types: list[dict]  # [{"remote_type": "Remote", "count": 80}]
    top_job_types: list[dict]  # [{"job_type": "Full-time", "count": 150}]
    jobs_by_date: list[dict]  # [{"date": "2025-01-01", "count": 5}]
