"""
Core CRUD Operations for Applications

Handles the fundamental Create, Read, Update, Delete operations for
job applications:
- Create new applications
- List applications with pagination and filtering
- Retrieve single application details
- Update application status and metadata
- Archive/unarchive applications
- Delete applications permanently

All endpoints require user authentication and enforce ownership constraints.
"""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from ...deps import get_current_user
from ...utils.pagination import PaginationParams, PaginatedResponse
from ....db import models
from ...schemas.applications import ApplicationCreate, ApplicationOut, ApplicationUpdate
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import logger, event_logger, paginate, broadcast_event

router = APIRouter()


@router.post("/", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new job application.
    
    Creates a new application record linking a job posting to the
    user's profile. Optionally attaches a resume and sets initial
    status. Logs the creation as a business event.
    
    Request Body:
        job_id (UUID): Job posting to apply to (required)
        resume_id (UUID): Resume document to attach (optional)
        status (str): Initial status (default: "applied")
                     Options: applied, interviewing, offered, rejected
        source (str): Application source (default: "manual")
                     Options: manual, extension, imported
                     
    Args:
        payload: Application creation data (from request body)
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        ApplicationOut: Created application with:
            - id: Application UUID
            - user_id: Owner UUID
            - job_id: Job posting UUID
            - resume_id: Attached resume UUID (if provided)
            - status: Current status
            - source: Creation source
            - created_at: Creation timestamp
            - updated_at: Last update timestamp
            
    Raises:
        HTTPException: 400 if validation fails (job not found, invalid status)
        HTTPException: 500 if creation fails
        
    Security:
        Requires user authentication
        Automatically associates application with authenticated user
        Validates job and resume ownership
        
    Notes:
        - Prevents duplicate applications to same job
        - Logs business event: "application_submitted"
        - Use for: manual applications, bulk imports
        - Extension creates applications with source="extension"
        
    Example:
        POST /api/applications
        Body: {
            "job_id": "...",
            "resume_id": "...",
            "status": "applied",
            "source": "manual"
        }
    """
    try:
        logger.info(
            "Creating application",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(payload.job_id) if payload.job_id else None,
                "status": payload.status
            }
        )
        
        dto = svc.create_or_update(
            user_id=current_user.id,
            job_id=payload.job_id,
            resume_id=payload.resume_id,
            status=payload.status,
            source=payload.source,
        )
        
        event_logger.log_application_submitted(
            user_id=current_user.id,
            application_id=dto.id,
            job_id=payload.job_id
        )
        
        logger.info(
            "Application created successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(dto.id),
                "job_id": str(payload.job_id) if payload.job_id else None
            }
        )
        
        return ApplicationOut(**dto.__dict__)
    
    except Exception as e:
        from ....domain.applications.errors import BadRequest
        if isinstance(e, BadRequest):
            logger.warning(
                "Invalid application creation request",
                extra={
                    "user_id": str(current_user.id),
                    "error": e.detail
                }
            )
            raise HTTPException(status_code=400, detail=e.detail)
        
        logger.error(
            "Failed to create application",
            extra={
                "user_id": str(current_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to create application"
        )


@router.get("/", response_model=PaginatedResponse[ApplicationOut])
def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    q: str = Query(""),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    show_archived: bool = Query(False),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    List user's job applications with pagination and filtering.
    
    Retrieves a paginated list of applications with support for
    filtering by status, search query, and archive state. Supports
    flexible sorting and ordering.
    
    Query Parameters:
        page (int): Page number (default: 1, min: 1)
        page_size (int): Items per page (default: 20, min: 1, max: 100)
        status (str): Filter by status (optional)
                     Options: applied, interviewing, offered, rejected
        q (str): Search query for job titles/companies (default: "")
        sort (str): Sort field (default: "created_at")
                   Options: created_at, updated_at, company, title
        order (str): Sort order (default: "desc")
                    Options: asc, desc
        show_archived (bool): Include archived applications (default: False)
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        PaginatedResponse[ApplicationOut]: Paginated results with:
            - items: List of applications (ApplicationOut[])
            - total: Total matching records
            - page: Current page number
            - page_size: Items per page
            - pages: Total pages
            - has_next: Whether next page exists
            - has_prev: Whether previous page exists
            
    Raises:
        HTTPException: 500 if listing fails
        
    Security:
        Requires user authentication
        Only returns applications owned by authenticated user
        
    Notes:
        - Returns empty list if no applications match filters
        - Search query matches job title and company name
        - Archived applications excluded by default
        - Use for: dashboard lists, filtering UI, exports
        
    Example:
        GET /api/applications?page=1&page_size=20&status=applied&q=engineer
        Returns: {
            "items": [...],
            "total": 45,
            "page": 1,
            "page_size": 20,
            "pages": 3,
            "has_next": true,
            "has_prev": false
        }
    """
    try:
        logger.debug(
            "Listing applications",
            extra={
                "user_id": str(current_user.id),
                "page": page,
                "page_size": page_size,
                "status": status,
                "query": q[:50] if q else None,
                "show_archived": show_archived
            }
        )
        
        items, total = svc.list_paginated(
            user_id=current_user.id,
            status=status or None,
            q=q or "",
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
            show_archived=show_archived
        )
        
        pages, has_next, has_prev = paginate(total, page, page_size)
        
        logger.debug(
            "Applications listed successfully",
            extra={
                "user_id": str(current_user.id),
                "total": total,
                "returned": len(items)
            }
        )
        
        return PaginatedResponse(
            items=[ApplicationOut(**i.__dict__) for i in items],
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev,
        )
    
    except Exception as e:
        logger.error(
            "Failed to list applications",
            extra={
                "user_id": str(current_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve applications"
        )


@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get a single application by ID.
    
    Retrieves complete details for a specific application, including
    job information, status, attachments, notes, and timeline data.
    
    Path Parameters:
        app_id (UUID): ID of the application to retrieve
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        ApplicationOut: Complete application details with:
            - id: Application UUID
            - user_id: Owner UUID
            - job_id: Job posting UUID
            - job: Nested job details (title, company, etc.)
            - resume_id: Attached resume UUID
            - status: Current status
            - source: Creation source
            - created_at: Creation timestamp
            - updated_at: Last update timestamp
            - archived_at: Archive timestamp (if archived)
            
    Raises:
        HTTPException: 404 if application not found
        HTTPException: 500 if retrieval fails
        
    Security:
        Requires user authentication
        Only allows accessing user's own applications
        
    Notes:
        - Includes full job posting details
        - Use for: detail views, editing forms
        
    Example:
        GET /api/applications/{app_id}
        Returns: {
            "id": "...",
            "job": {"title": "...", "company": "..."},
            "status": "interviewing",
            ...
        }
    """
    try:
        logger.debug(
            "Fetching application",
            extra={"user_id": str(current_user.id), "application_id": str(app_id)}
        )
        
        dto = svc.get_owned_app(app_id=app_id, user_id=current_user.id)
        return ApplicationOut(**dto.__dict__)
    
    except Exception as e:
        logger.warning(
            "Application not found or access denied",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            }
        )
        raise HTTPException(status_code=404, detail="Application not found")


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: uuid.UUID,
    payload: ApplicationUpdate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing application.
    
    Partially updates application fields. Only provided fields are
    updated; omitted fields remain unchanged. Commonly used for
    status updates, resume changes, or metadata updates.
    
    Path Parameters:
        app_id (UUID): ID of the application to update
        
    Request Body:
        status (str): New status (optional)
                     Options: applied, interviewing, offered, rejected
        resume_id (UUID): New resume attachment (optional)
        notes (str): Additional notes (optional)
        
    Args:
        payload: Partial update data (from request body)
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        ApplicationOut: Updated application with all current values
        
    Raises:
        HTTPException: 404 if application not found
        HTTPException: 400 if update validation fails
        HTTPException: 500 if update fails
        
    Security:
        Requires user authentication
        Only allows updating user's own applications
        Validates resume ownership if provided
        
    Notes:
        - Partial update semantics (PATCH not PUT)
        - Broadcasts 'application_updated' WebSocket event
        - Updates updated_at timestamp automatically
        - Use for: status changes, quick edits
        
    Example:
        PATCH /api/applications/{app_id}
        Body: {"status": "interviewing"}
        Returns: Full updated application object
    """
    try:
        logger.info(
            "Updating application status",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "new_status": payload.status
            }
        )
        
        app = svc.update_status(
            user_id=current_user.id,
            app_id=app_id,
            new_status=payload.status
        )
        
        logger.info(
            "Application status updated",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app.id),
                "status": app.status
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("stage_changed", str(app.id), status=app.status)
        
        return ApplicationOut(**app.__dict__)
    
    except Exception as e:
        logger.error(
            "Failed to update application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update application"
        )


@router.put("/{app_id}/archive", response_model=ApplicationOut)
def toggle_archive_application(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Toggle archive status of an application.
    
    Archives an active application or unarchives an archived one.
    Archived applications are hidden from default lists but remain
    accessible via the show_archived filter.
    
    Path Parameters:
        app_id (UUID): ID of the application to archive/unarchive
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        ApplicationOut: Updated application with:
            - is_archived: Current archive status (true/false)
            - archived_at: Archive timestamp (if archived)
            All other fields unchanged
            
    Raises:
        HTTPException: 404 if application not found
        HTTPException: 500 if toggle fails
        
    Security:
        Requires user authentication
        Only allows archiving user's own applications
        
    Notes:
        - Idempotent operation (toggle effect)
        - Archived apps excluded from default lists
        - Use show_archived=true query param to include
        - Broadcasts 'application_archived' WebSocket event
        - Use for: cleanup, hiding old applications
        - Does NOT delete data - fully reversible
        
    Example:
        PUT /api/applications/{app_id}/archive
        Returns: {"is_archived": true, "archived_at": "...", ...}
    """
    try:
        logger.info(
            "Toggling archive status",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        app = svc.toggle_archive(user_id=current_user.id, app_id=app_id)
        
        logger.info(
            "Archive status toggled",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app.id),
                "is_archived": app.is_archived
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("application_archived", str(app.id), is_archived=app.is_archived)
        
        return ApplicationOut(**app.__dict__)
    
    except Exception as e:
        logger.error(
            "Failed to toggle archive",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to toggle archive status"
        )


@router.delete("/{app_id}")
def delete_application(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete an application permanently.
    
    Permanently removes an application and all associated data:
    - Application record
    - Associated notes
    - Associated stages
    - Attachment references (files remain in storage)
    
    **THIS ACTION CANNOT BE UNDONE**
    
    Path Parameters:
        app_id (UUID): ID of the application to delete
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        dict: Success message with:
            - message: "Application deleted successfully"
            
    Raises:
        HTTPException: 404 if application not found
        HTTPException: 500 if deletion fails
        
    Security:
        Requires user authentication
        Only allows deleting user's own applications
        
    Notes:
        - **PERMANENT DELETION** - Cannot be recovered
        - Consider archiving instead for soft delete
        - Cascades to related records (notes, stages)
        - File attachments remain in storage
        - Broadcasts 'application_deleted' WebSocket event
        - Use for: permanent cleanup, GDPR compliance
        
    Example:
        DELETE /api/applications/{app_id}
        Returns: {"message": "Application deleted successfully"}
    """
    try:
        logger.info(
            "Deleting application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        svc.delete(user_id=current_user.id, app_id=app_id)
        
        logger.info(
            "Application deleted",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("application_deleted", str(app_id))
        
        return {"message": "Application deleted successfully"}
    
    except Exception as e:
        logger.error(
            "Failed to delete application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete application"
        )
