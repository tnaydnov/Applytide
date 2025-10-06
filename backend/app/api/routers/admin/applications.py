# backend/app/api/routers/admin/applications.py
"""Application management"""
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
from ....domain.admin.applications_service import ApplicationsAdminService
from ....infra.logging import get_logger


router = APIRouter(tags=["admin-applications"])
logger = get_logger(__name__)


class ApplicationSummaryResponse(BaseModel):
    id: str
    user_id: Optional[str]
    job_id: str
    resume_id: Optional[str]
    status: str
    source: Optional[str]
    created_at: datetime
    user_email: Optional[str]
    job_title: Optional[str]
    company_name: Optional[str]


class ApplicationDetailResponse(BaseModel):
    id: str
    user_id: Optional[str]
    job_id: str
    resume_id: Optional[str]
    status: str
    source: Optional[str]
    created_at: datetime
    user_email: Optional[str]
    user_name: Optional[str]
    job_title: Optional[str]
    job_location: Optional[str]
    company_name: Optional[str]
    resume_label: Optional[str]


class ApplicationStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New application status")
    justification: str = Field(..., description="Reason for the status update")


class ApplicationBulkDeleteRequest(BaseModel):
    application_ids: list[str] = Field(..., description="List of application IDs to delete")
    justification: str = Field(..., description="Reason for bulk deletion")


class ApplicationAnalyticsResponse(BaseModel):
    total_applications: int
    apps_7d: int
    apps_30d: int
    by_status: list[dict]
    by_source: list[dict]
    conversion_funnel: list[dict]
    apps_by_date: list[dict]


@router.get("/applications", response_model=dict)
@limiter.limit("100/minute")
async def list_applications(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """List all applications with pagination and filters"""
    service = ApplicationsAdminService(db)
    
    user_uuid = UUID(user_id) if user_id else None
    job_uuid = UUID(job_id) if job_id else None
    
    applications, total = await service.list_applications(
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        source=source,
        user_id=user_uuid,
        job_id=job_uuid,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return {
        "applications": [
            {
                "id": str(app.id),
                "user_id": str(app.user_id) if app.user_id else None,
                "job_id": str(app.job_id),
                "resume_id": str(app.resume_id) if app.resume_id else None,
                "status": app.status,
                "source": app.source,
                "created_at": app.created_at.isoformat(),
                "user_email": app.user_email,
                "job_title": app.job_title,
                "company_name": app.company_name
            }
            for app in applications
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/applications/{app_id}", response_model=ApplicationDetailResponse)
@limiter.limit("100/minute")
async def get_application_detail(
    request: Request,
    app_id: UUID,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get detailed application information"""
    service = ApplicationsAdminService(db)
    app = await service.get_application_detail(app_id)
    
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return ApplicationDetailResponse(
        id=str(app.id),
        user_id=str(app.user_id) if app.user_id else None,
        job_id=str(app.job_id),
        resume_id=str(app.resume_id) if app.resume_id else None,
        status=app.status,
        source=app.source,
        created_at=app.created_at,
        user_email=app.user_email,
        user_name=app.user_name,
        job_title=app.job_title,
        job_location=app.job_location,
        company_name=app.company_name,
        resume_label=app.resume_label
    )


@router.patch("/applications/{app_id}/status")
@limiter.limit("20/minute")
async def update_application_status(
    request: Request,
    app_id: UUID,
    body: ApplicationStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Update application status (requires step-up authentication)"""
    service = ApplicationsAdminService(db)
    
    success = await service.update_application_status(
        app_id=app_id,
        admin_id=current_admin.id,
        status=body.status,
        justification=body.justification
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return {
        "success": True,
        "message": "Application status updated successfully",
        "application_id": str(app_id),
        "new_status": body.status
    }


@router.delete("/applications/{app_id}")
@limiter.limit("20/minute")
async def delete_application(
    request: Request,
    app_id: UUID,
    justification: str = Query(..., description="Reason for deletion"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Delete an application (requires step-up authentication)"""
    service = ApplicationsAdminService(db)
    
    success = await service.delete_application(
        app_id=app_id,
        admin_id=current_admin.id,
        justification=justification
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return {
        "success": True,
        "message": "Application deleted successfully",
        "application_id": str(app_id)
    }


@router.post("/applications/bulk-delete")
@limiter.limit("10/minute")
async def bulk_delete_applications(
    request: Request,
    body: ApplicationBulkDeleteRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Bulk delete applications (requires step-up authentication)"""
    service = ApplicationsAdminService(db)
    
    app_ids = [UUID(aid) for aid in body.application_ids]
    deleted_count = await service.bulk_delete_applications(
        app_ids=app_ids,
        admin_id=current_admin.id,
        justification=body.justification
    )
    
    return {
        "success": True,
        "message": f"Deleted {deleted_count} applications",
        "deleted_count": deleted_count
    }


@router.get("/applications/analytics/overview", response_model=ApplicationAnalyticsResponse)
@limiter.limit("100/minute")
async def get_application_analytics(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get application analytics"""
    service = ApplicationsAdminService(db)
    analytics = await service.get_application_analytics()
    
    return ApplicationAnalyticsResponse(
        total_applications=analytics.total_applications,
        apps_7d=analytics.apps_7d,
        apps_30d=analytics.apps_30d,
        by_status=analytics.by_status,
        by_source=analytics.by_source,
        conversion_funnel=analytics.conversion_funnel,
        apps_by_date=analytics.apps_by_date
    )