"""
Application Query and Read-Only Endpoints

Provides read-only data access for applications:
- List statuses used by user
- Get applications in card format (for Kanban boards)
- Get applications with their stages (for pipeline views)
- Get detailed application information (full context)

All endpoints require user authentication.
These are optimized read operations that don't modify data.
"""
from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from ...deps import get_current_user
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
    """
    Retrieve list of unique statuses used by user's applications.
    
    Returns all distinct status values from the user's applications.
    Useful for populating status filter dropdowns and Kanban board columns.
    
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        List[str]: List of unique status strings (e.g., ['applied', 'interview', 'offer'])
        
    Raises:
        HTTPException: 500 if statuses cannot be retrieved
        
    Security:
        Requires user authentication
        Only returns statuses from user's own applications
        
    Notes:
        - Returns empty list if user has no applications
        - Statuses are sorted alphabetically
        - Use for: filter dropdowns, Kanban board columns, status analytics
        
    Example:
        GET /api/applications/statuses
        Returns: ["applied", "interview", "offer", "rejected"]
    """
    try:
        logger.debug(
            "Fetching used statuses",
            extra={"user_id": str(current_user.id)}
        )
        
        statuses = svc.get_used_statuses(user_id=current_user.id)
        
        logger.debug(
            "Retrieved used statuses",
            extra={
                "user_id": str(current_user.id),
                "status_count": len(statuses),
                "statuses": statuses
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
    """
    Retrieve applications in card format for Kanban board display.
    
    Returns simplified application data optimized for card-based UI
    components like Kanban boards. Includes essential information
    without heavy nested relationships.
    
    Query Parameters:
        status (str): Filter by specific status (optional)
        show_archived (bool): Include archived applications (default: false)
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        List[ApplicationCard]: List of application cards containing:
            - id: Application UUID
            - status: Current status
            - resume_id: Associated resume UUID
            - created_at: Creation timestamp
            - updated_at: Last update timestamp
            - job: Minimal job info (id, title, company_name)
            
    Raises:
        HTTPException: 500 if cards cannot be retrieved
        
    Security:
        Requires user authentication
        Only returns user's own applications
        
    Notes:
        - Optimized query with minimal joins for performance
        - Use for Kanban boards, card grids, quick overviews
        - Archived applications excluded by default
        - Results are sorted by updated_at desc
        
    Example:
        GET /api/applications/cards?status=interview&show_archived=false
        Returns interview-stage applications as card data
    """
    try:
        logger.debug(
            "Fetching application cards",
            extra={
                "user_id": str(current_user.id),
                "status_filter": status,
                "show_archived": show_archived
            }
        )
        
        rows = svc.list_cards(
            user_id=current_user.id,
            status=status,
            show_archived=show_archived
        )
        
        cards = [
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
            ) for r in rows[:500]  # Hard cap to prevent unbounded results
        ]
        
        logger.info(
            "Application cards retrieved",
            extra={
                "user_id": str(current_user.id),
                "card_count": len(cards),
                "status_filter": status
            }
        )
        
        return cards
        
    except Exception as e:
        logger.error(
            "Failed to fetch application cards",
            extra={
                "user_id": str(current_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve application cards"
        )


@router.get("/with-stages", response_model=List[dict])
def list_applications_with_stages(
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve applications with their associated stages for pipeline views.
    
    Returns applications with full stage history, optimized for
    pipeline visualizations showing application progression through
    interview stages.
    
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        List[dict]: List of application objects with nested stages array
        
    Raises:
        HTTPException: 500 if data cannot be retrieved
        
    Security:
        Requires user authentication
        Only returns user's own applications and stages
        
    Notes:
        - Includes all stages for each application
        - Stages are ordered chronologically
        - Use for: pipeline views, stage progression tracking
        - More expensive query than /cards due to joins
        
    Example:
        GET /api/applications/with-stages
        Returns applications with full stage arrays
    """
    try:
        logger.debug(
            "Fetching applications with stages",
            extra={"user_id": str(current_user.id)}
        )
        
        results = svc.list_with_stages(user_id=current_user.id)[:500]  # Hard cap
        
        logger.info(
            "Applications with stages retrieved",
            extra={
                "user_id": str(current_user.id),
                "application_count": len(results)
            }
        )
        
        return results
        
    except Exception as e:
        logger.error(
            "Failed to fetch applications with stages",
            extra={
                "user_id": str(current_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve applications with stages"
        )


@router.get("/{app_id}/detail", response_model=ApplicationDetail)
def get_detail(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve comprehensive application details with all related data.
    
    Returns complete application context including job details, stages,
    notes, and attachments. This is the primary endpoint for viewing
    full application information in detail pages.
    
    Path Parameters:
        app_id (UUID): ID of the application to retrieve
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        ApplicationDetail: Complete application details containing:
            - application: Full application object
            - job: Complete job details (title, company, description, etc.)
            - resume_label: Name of associated resume
            - stages: List of all interview/process stages
            - notes: List of all notes
            - attachments: List of all uploaded files
            
    Raises:
        HTTPException: 404 if application not found or access denied
        HTTPException: 500 if details cannot be retrieved
        
    Security:
        Requires user authentication
        Only returns application if owned by current user
        
    Notes:
        - Most expensive query - fetches all related data
        - Job information included even if job was deleted (shows "missing")
        - Stages ordered chronologically
        - Notes ordered by creation date
        - Use for: detail pages, comprehensive views
        
    Example:
        GET /api/applications/123e4567-e89b-12d3-a456-426614174000/detail
        Returns complete application context
    """
    try:
        logger.debug(
            "Fetching application detail",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        (
            app, job, company_name, company_website,
            resume_label, stages, notes, attachments
        ) = svc.get_detail(user_id=current_user.id, app_id=app_id)
        
        # Build job detail (handle missing job case)
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
            # Job was deleted but application remains
            job_detail = JobDetailMini(
                id=app.job_id,
                title="(missing)",
                company_name=None,
                company_website=None,
                location=None,
                source_url=None,
                description=None
            )
        
        logger.info(
            "Application detail retrieved",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stages_count": len(stages),
                "notes_count": len(notes),
                "attachments_count": len(attachments)
            }
        )
        
        return ApplicationDetail(
            application=ApplicationOut(**app.__dict__),
            job=job_detail,
            resume_label=resume_label,
            stages=[StageOut(**s.__dict__) for s in stages],
            notes=[NoteOut(**n.__dict__) for n in notes],
            attachments=[AttachmentOut(**a.__dict__) for a in attachments],
        )
        
    except Exception as e:
        logger.error(
            "Failed to fetch application detail",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        # Check if it's a not found / access denied case
        if "not found" in str(e).lower() or "access" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve application details"
        )
