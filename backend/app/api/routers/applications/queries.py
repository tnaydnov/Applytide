"""Query and read-only endpoints for applications."""
from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from ...deps_auth import get_current_user
from ....db import models
from ...schemas.applications import (
    ApplicationCard, JobMini, ApplicationDetail, JobDetailMini,
    ApplicationOut, StageOut, NoteOut, AttachmentOut
)
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import logger

router = APIRouter()


@router.get("/statuses", response_model=List[str])
def get_used_statuses(
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Get list of unique statuses used by user's applications."""
    try:
        statuses = svc.get_used_statuses(user_id=current_user.id)
        logger.debug(
            "Retrieved used statuses",
            extra={
                "user_id": str(current_user.id),
                "status_count": len(statuses)
            }
        )
        return statuses
    except Exception as e:
        logger.error(
            "Failed to get used statuses",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve statuses"
        )


@router.get("/cards", response_model=List[ApplicationCard])
def list_cards(
    status: Optional[str] = Query(None),
    show_archived: bool = Query(False),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Get applications in card format."""
    rows = svc.list_cards(user_id=current_user.id, status=status, show_archived=show_archived)
    return [
        ApplicationCard(
            id=r.id,
            status=r.status,
            resume_id=r.resume_id,
            created_at=r.created_at,
            updated_at=r.updated_at,
            job=JobMini(
                id=r.job_id,
                title=r.title,
                company_name=r.company_name
            )
        ) for r in rows
    ]


@router.get("/with-stages", response_model=List[dict])
def list_applications_with_stages(
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Get applications with their stages."""
    return svc.list_with_stages(user_id=current_user.id)


@router.get("/{app_id}/detail", response_model=ApplicationDetail)
def get_detail(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Get detailed application information including job, stages, notes, and attachments."""
    (
        app, job, company_name, company_website,
        resume_label, stages, notes, attachments
    ) = svc.get_detail(user_id=current_user.id, app_id=app_id)
    
    # Build job detail
    if job:
        job_detail = JobDetailMini(
            id=job.id,
            title=job.title,
            company_name=job.company_name,
            company_website=job.company_website,
            location=job.location,
            source_url=job.source_url,
            description=job.description
        )
    else:
        job_detail = JobDetailMini(
            id=app.job_id,
            title="(missing)",
            company_name=None,
            company_website=None,
            location=None,
            source_url=None,
            description=None
        )
    
    return ApplicationDetail(
        application=ApplicationOut(**app.__dict__),
        job=job_detail,
        resume_label=resume_label,
        stages=[StageOut(**s.__dict__) for s in stages],
        notes=[NoteOut(**n.__dict__) for n in notes],
        attachments=[AttachmentOut(**a.__dict__) for a in attachments],
    )
