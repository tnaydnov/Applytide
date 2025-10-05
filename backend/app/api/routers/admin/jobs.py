# backend/app/api/routers/admin/jobs.py
"""Job management endpoints"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.jobs_service import JobsAdminService


router = APIRouter(tags=["admin-jobs"])


# ==================== SCHEMAS ====================

class JobSummaryResponse(BaseModel):
    id: str
    title: str
    location: Optional[str]
    remote_type: Optional[str]
    job_type: Optional[str]
    source_url: Optional[str]
    user_id: Optional[str]
    company_id: Optional[str]
    created_at: datetime
    total_applications: int
    company_name: Optional[str]


class JobDetailResponse(BaseModel):
    id: str
    title: str
    location: Optional[str]
    remote_type: Optional[str]
    job_type: Optional[str]
    description: Optional[str]
    requirements: List[str]
    skills: List[str]
    source_url: Optional[str]
    user_id: Optional[str]
    company_id: Optional[str]
    created_at: datetime
    total_applications: int
    company_name: Optional[str]
    applications: list


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    source_url: Optional[str] = None
    justification: str = Field(..., description="Reason for the update")


class JobBulkDeleteRequest(BaseModel):
    job_ids: List[str] = Field(..., description="List of job IDs to delete")
    justification: str = Field(..., description="Reason for bulk deletion")


class JobAnalyticsResponse(BaseModel):
    total_jobs: int
    jobs_7d: int
    jobs_30d: int
    jobs_with_applications: int
    avg_applications_per_job: float
    top_locations: List[dict]
    top_remote_types: List[dict]
    top_job_types: List[dict]
    jobs_by_date: List[dict]


# ==================== ENDPOINTS ====================

@router.get("/jobs", response_model=dict)
@limiter.limit("100/minute")
async def list_jobs(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    remote_type: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    has_applications: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """List all jobs with pagination and filters"""
    service = JobsAdminService(db)
    jobs, total = await service.list_jobs(
        skip=skip,
        limit=limit,
        search=search,
        location=location,
        remote_type=remote_type,
        job_type=job_type,
        has_applications=has_applications,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return {
        "jobs": [
            {
                "id": str(job.id),
                "title": job.title,
                "location": job.location,
                "remote_type": job.remote_type,
                "job_type": job.job_type,
                "source_url": job.source_url,
                "user_id": str(job.user_id) if job.user_id else None,
                "company_id": str(job.company_id) if job.company_id else None,
                "created_at": job.created_at.isoformat(),
                "total_applications": job.total_applications,
                "company_name": job.company_name
            }
            for job in jobs
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/jobs/{job_id}", response_model=JobDetailResponse)
@limiter.limit("100/minute")
async def get_job_detail(
    request: Request,
    job_id: UUID,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get detailed job information"""
    service = JobsAdminService(db)
    job = await service.get_job_detail(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return JobDetailResponse(
        id=str(job.id),
        title=job.title,
        location=job.location,
        remote_type=job.remote_type,
        job_type=job.job_type,
        description=job.description,
        requirements=job.requirements,
        skills=job.skills,
        source_url=job.source_url,
        user_id=str(job.user_id) if job.user_id else None,
        company_id=str(job.company_id) if job.company_id else None,
        created_at=job.created_at,
        total_applications=job.total_applications,
        company_name=job.company_name,
        applications=job.applications or []
    )


@router.put("/jobs/{job_id}")
@limiter.limit("20/minute")
async def update_job(
    request: Request,
    job_id: UUID,
    body: JobUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Update job details (requires step-up authentication)"""
    service = JobsAdminService(db)
    
    success = await service.update_job(
        job_id=job_id,
        admin_id=current_admin.id,
        justification=body.justification,
        title=body.title,
        location=body.location,
        remote_type=body.remote_type,
        job_type=body.job_type,
        description=body.description,
        requirements=body.requirements,
        skills=body.skills,
        source_url=body.source_url
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return {
        "success": True,
        "message": "Job updated successfully",
        "job_id": str(job_id)
    }


@router.delete("/jobs/{job_id}")
@limiter.limit("20/minute")
async def delete_job(
    request: Request,
    job_id: UUID,
    justification: str = Query(..., description="Reason for deletion"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Delete a job (requires step-up authentication)"""
    service = JobsAdminService(db)
    
    success = await service.delete_job(
        job_id=job_id,
        admin_id=current_admin.id,
        justification=justification
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return {
        "success": True,
        "message": "Job deleted successfully",
        "job_id": str(job_id)
    }


@router.post("/jobs/bulk-delete")
@limiter.limit("10/minute")
async def bulk_delete_jobs(
    request: Request,
    body: JobBulkDeleteRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Bulk delete jobs (requires step-up authentication)"""
    service = JobsAdminService(db)
    
    job_ids = [UUID(jid) for jid in body.job_ids]
    deleted_count = await service.bulk_delete_jobs(
        job_ids=job_ids,
        admin_id=current_admin.id,
        justification=body.justification
    )
    
    return {
        "success": True,
        "message": f"Deleted {deleted_count} jobs",
        "deleted_count": deleted_count
    }


@router.get("/jobs/analytics/overview", response_model=JobAnalyticsResponse)
@limiter.limit("100/minute")
async def get_job_analytics(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get job analytics"""
    service = JobsAdminService(db)
    analytics = await service.get_job_analytics()
    
    return JobAnalyticsResponse(
        total_jobs=analytics.total_jobs,
        jobs_7d=analytics.jobs_7d,
        jobs_30d=analytics.jobs_30d,
        jobs_with_applications=analytics.jobs_with_applications,
        avg_applications_per_job=analytics.avg_applications_per_job,
        top_locations=analytics.top_locations,
        top_remote_types=analytics.top_remote_types,
        top_job_types=analytics.top_job_types,
        jobs_by_date=analytics.jobs_by_date
    )
