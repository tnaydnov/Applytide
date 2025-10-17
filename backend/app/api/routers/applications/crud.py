"""Core CRUD operations for applications."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from ...deps_auth import get_current_user
from ...utils.pagination import PaginationParams, PaginatedResponse
from ....db import models
from ...schemas.applications import ApplicationCreate, ApplicationOut, ApplicationUpdate
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import logger, event_logger, paginate, broadcast_event

router = APIRouter()


@router.post("", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new job application."""
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
            app_id=dto.id,
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


@router.get("", response_model=PaginatedResponse[ApplicationOut])
def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    q: str = Query(""),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """List user's job applications with pagination and filtering."""
    try:
        logger.debug(
            "Listing applications",
            extra={
                "user_id": str(current_user.id),
                "page": page,
                "page_size": page_size,
                "status": status,
                "query": q[:50] if q else None
            }
        )
        
        items, total = svc.list_paginated(
            user_id=current_user.id,
            status=status or None,
            q=q or "",
            sort=sort,
            order=order,
            page=page,
            page_size=page_size
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
    """Get a single application by ID."""
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
    """Update application status."""
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


@router.delete("/{app_id}")
def delete_application(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Delete an application."""
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
