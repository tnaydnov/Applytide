"""
Application Stage Management Endpoints

Handles interview/process stage tracking for applications:
- Add new stages (interviews, assessments, etc.)
- List all stages for an application
- Update stage details (outcome, notes, scheduling)
- Delete stages

All endpoints require user authentication and ownership verification.
Stages represent the progression of an application through the hiring process.
"""
from __future__ import annotations
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ...deps import get_current_user
from ....db import models
from ...schemas.applications import StageCreate, StageOut, StageUpdate
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import broadcast_event, logger

router = APIRouter()


@router.post("/{app_id}/stages", response_model=StageOut)
def add_stage(
    app_id: uuid.UUID,
    payload: StageCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Add a new stage to an application's hiring process.
    
    Creates a stage record representing an interview, assessment,
    or other step in the hiring process. Stages help track
    application progression and scheduling.
    
    Path Parameters:
        app_id (UUID): ID of the application to add stage to
        
    Request Body:
        name (str): Stage name (e.g., "Phone Screen", "Technical Interview")
        scheduled_at (datetime): Optional scheduled date/time
        outcome (str): Optional outcome (e.g., "passed", "failed", "pending")
        notes (str): Optional notes about the stage
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        StageOut: Created stage object with:
            - id: Stage UUID
            - application_id: Parent application UUID
            - name: Stage name
            - scheduled_at: Scheduled timestamp
            - outcome: Stage outcome
            - notes: Stage notes
            - created_at: Creation timestamp
            
    Raises:
        HTTPException: 404 if application not found or access denied
        HTTPException: 500 if stage cannot be created
        
    Security:
        Requires user authentication
        Only allows adding stages to user's own applications
        
    Notes:
        - Stages are ordered chronologically by created_at
        - Broadcasts 'stage_added' WebSocket event
        - Use for: tracking interview pipeline, scheduling reminders
        
    Example:
        POST /api/applications/123e4567-e89b-12d3-a456-426614174000/stages
        Body: {"name": "Technical Interview", "scheduled_at": "2025-11-01T14:00:00Z"}
    """
    try:
        logger.debug(
            "Adding stage to application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_name": payload.name
            }
        )
        
        stage = svc.add_stage(
            user_id=current_user.id,
            app_id=app_id,
            name=payload.name,
            scheduled_at=payload.scheduled_at,
            outcome=payload.outcome,
            notes=payload.notes
        )
        
        logger.info(
            "Stage added successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage.id),
                "stage_name": stage.name
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("stage_added", str(app_id))
        
        return StageOut(**stage.__dict__)
        
    except Exception as e:
        logger.error(
            "Failed to add stage",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower() or "access" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to add stage"
        )


@router.get("/{app_id}/stages", response_model=List[StageOut])
def list_stages(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve all stages for an application.
    
    Returns complete stage history for the application,
    ordered chronologically to show hiring process progression.
    
    Path Parameters:
        app_id (UUID): ID of the application whose stages to retrieve
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        List[StageOut]: List of stage objects ordered by created_at
        
    Raises:
        HTTPException: 404 if application not found or access denied
        HTTPException: 500 if stages cannot be retrieved
        
    Security:
        Requires user authentication
        Only returns stages from user's own applications
        
    Notes:
        - Stages ordered chronologically
        - Returns empty list if no stages exist
        - Use for: timeline views, process tracking
        
    Example:
        GET /api/applications/123e4567-e89b-12d3-a456-426614174000/stages
        Returns all stages for the application
    """
    try:
        logger.debug(
            "Listing application stages",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        items = svc.list_stages(user_id=current_user.id, app_id=app_id)
        
        logger.debug(
            "Stages retrieved",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_count": len(items)
            }
        )
        
        return [StageOut(**i.__dict__) for i in items]
        
    except Exception as e:
        logger.error(
            "Failed to list stages",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower() or "access" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve stages"
        )


@router.patch("/{app_id}/stages/{stage_id}", response_model=StageOut)
def update_stage_partial(
    app_id: uuid.UUID,
    stage_id: uuid.UUID,
    payload: StageUpdate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Update a stage with partial data (PATCH).
    
    Allows updating specific stage fields without requiring all data.
    Only provided fields are updated, others remain unchanged.
    
    Path Parameters:
        app_id (UUID): ID of the application
        stage_id (UUID): ID of the stage to update
        
    Request Body (all optional):
        name (str): Updated stage name
        scheduled_at (datetime): Updated scheduled time
        outcome (str): Updated outcome
        notes (str): Updated notes
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        StageOut: Updated stage object
        
    Raises:
        HTTPException: 404 if application or stage not found
        HTTPException: 500 if update fails
        
    Security:
        Requires user authentication
        Only allows updating stages from user's own applications
        
    Notes:
        - Partial update - only sends fields to change
        - Broadcasts 'stage_updated' WebSocket event
        - Use for: rescheduling, updating outcomes, adding notes
        
    Example:
        PATCH /api/applications/{app_id}/stages/{stage_id}
        Body: {"outcome": "passed", "notes": "Great interview!"}
    """
    try:
        logger.debug(
            "Updating stage",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage_id)
            }
        )
        
        s = svc.update_stage_partial(
            user_id=current_user.id,
            app_id=app_id,
            stage_id=stage_id,
            name=payload.name,
            scheduled_at=payload.scheduled_at,
            outcome=payload.outcome,
            notes=payload.notes
        )
        
        logger.info(
            "Stage updated successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage_id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("stage_updated", str(app_id))
        
        return StageOut(**s.__dict__)
        
    except Exception as e:
        logger.error(
            "Failed to update stage",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=404, detail="Stage not found")


@router.delete("/{app_id}/stages/{stage_id}")
def delete_stage(
    app_id: uuid.UUID,
    stage_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete a stage from an application.
    
    Permanently removes a stage from the hiring process timeline.
    Use when a stage was added in error or is no longer relevant.
    
    Path Parameters:
        app_id (UUID): ID of the application
        stage_id (UUID): ID of the stage to delete
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        dict: Success confirmation
        
    Raises:
        HTTPException: 404 if application or stage not found
        HTTPException: 500 if deletion fails
        
    Security:
        Requires user authentication
        Only allows deleting stages from user's own applications
        
    Notes:
        - Deletion is permanent
        - Broadcasts 'stage_deleted' WebSocket event
        - Use when: correcting mistakes, cleaning up old data
        
    Example:
        DELETE /api/applications/{app_id}/stages/{stage_id}
        Returns: {"success": true}
    """
    try:
        logger.info(
            "Deleting stage",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage_id)
            }
        )
        
        svc.delete_stage(
            user_id=current_user.id,
            app_id=app_id,
            stage_id=stage_id
        )
        
        logger.info(
            "Stage deleted successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage_id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("stage_deleted", str(app_id))
        
        return {"success": True}
        
    except Exception as e:
        logger.error(
            "Failed to delete stage",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "stage_id": str(stage_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=404, detail="Stage not found")
