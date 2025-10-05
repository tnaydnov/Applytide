# backend/app/domain/admin/applications_dto.py
"""Data transfer objects for admin application management"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class ApplicationSummaryDTO:
    """Summary info for application list in admin"""
    id: UUID
    user_id: Optional[UUID]
    job_id: UUID
    resume_id: Optional[UUID]
    status: str
    source: Optional[str]
    created_at: datetime
    # Related data
    user_email: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None


@dataclass
class ApplicationDetailDTO:
    """Detailed application info for admin inspection"""
    id: UUID
    user_id: Optional[UUID]
    job_id: UUID
    resume_id: Optional[UUID]
    status: str
    source: Optional[str]
    created_at: datetime
    # Related data
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    job_title: Optional[str] = None
    job_location: Optional[str] = None
    company_name: Optional[str] = None
    resume_label: Optional[str] = None


@dataclass
class ApplicationAnalyticsDTO:
    """Analytics data for application management"""
    total_applications: int
    apps_7d: int
    apps_30d: int
    by_status: list[dict]  # [{"status": "Applied", "count": 100}]
    by_source: list[dict]  # [{"source": "Direct", "count": 50}]
    conversion_funnel: list[dict]  # [{"stage": "Applied", "count": 100, "conversion_rate": 1.0}]
    apps_by_date: list[dict]  # [{"date": "2025-01-01", "count": 5}]
    avg_time_to_offer: Optional[float] = None
