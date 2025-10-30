"""
Analytics Data Transfer Objects (DTOs)

Lightweight dataclasses for analytics data transfer between service and API layers.
Uses standard library dataclasses for minimal overhead and fast serialization.

Categories:
    - Application Data: Job applications with metadata
    - Stage Data: Application stage/interview information
    - Job Data: Job postings and details
    - Company Data: Company information

Design Patterns:
    - Dataclasses: Fast, lightweight, no validation overhead
    - Optional fields: Use None for nullable database columns
    - Minimal structure: Only fields needed for analytics calculations
    - from_attributes: Populated from SQLAlchemy models

Performance:
    - Dataclasses are ~30% faster than Pydantic models for serialization
    - No validation means less CPU overhead
    - Ideal for internal data transfer where validation already occurred

Example:
    from app.domain.analytics import dto
    from app.db.models import Application
    
    # Convert ORM model to DTO
    app = ApplicationLiteDTO(
        id=application.id,
        user_id=application.user_id,
        job_id=application.job_id,
        status=application.status,
        created_at=application.created_at,
        updated_at=application.updated_at,
        source=application.source,
        resume_id=application.resume_id,
        has_cover_letter=bool(application.cover_letter_id)
    )
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


# ═══════════════════════════════════════════════════════════════════════════
# APPLICATION DATA - Job applications and tracking
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ApplicationLiteDTO:
    """
    Lightweight job application data for analytics.
    
    Minimal application info needed for metrics calculations.
    
    Attributes:
        id: Application UUID
        user_id: User who created application
        job_id: Job being applied to
        status: Current application status (e.g., "applied", "interview", "offer")
        created_at: When application was created
        updated_at: Last update timestamp
        source: Application source (e.g., "LinkedIn", "Indeed", "Company Website")
        resume_id: Resume version used (for A/B testing)
        has_cover_letter: Whether cover letter was submitted
    """
    id: UUID
    user_id: UUID
    job_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    # Optional fields for experiments/sources
    source: Optional[str] = None
    resume_id: Optional[UUID] = None
    has_cover_letter: Optional[bool] = None


# ═══════════════════════════════════════════════════════════════════════════
# STAGE DATA - Interview stages and outcomes
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class StageLiteDTO:
    """
    Lightweight application stage data.
    
    Represents interview stages, phone screens, and other milestones.
    
    Attributes:
        id: Stage UUID
        application_id: Parent application
        name: Stage name (e.g., "Phone Screen", "Technical Interview", "Offer")
        outcome: Stage outcome (e.g., "passed", "rejected", "pending")
        created_at: When stage occurred/was created
    """
    id: UUID
    application_id: UUID
    name: str
    outcome: Optional[str]
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════
# JOB DATA - Job postings and details
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class JobLiteDTO:
    """
    Lightweight job posting data.
    
    Minimal job info for analytics grouping and aggregation.
    
    Attributes:
        id: Job UUID
        title: Job title
        company_id: Company posting the job (None if unknown)
        created_at: When job was added to system
    """
    id: UUID
    title: str
    company_id: Optional[UUID]
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════
# COMPANY DATA - Company information
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class CompanyLiteDTO:
    """
    Lightweight company data.
    
    Minimal company info for analytics grouping.
    
    Attributes:
        id: Company UUID
        name: Company name
        location: Company location (e.g., "San Francisco, CA")
    """
    id: UUID
    name: str
    location: Optional[str]
