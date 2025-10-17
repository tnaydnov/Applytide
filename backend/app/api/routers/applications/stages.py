"""Stage management endpoints for applications."""
from __future__ import annotations
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ...deps_auth import get_current_user
from ....db import models
from ...schemas.applications import StageCreate, StageOut, StageUpdate
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import broadcast_event

router = APIRouter()


@router.post("/{app_id}/stages", response_model=StageOut)
def add_stage(
    app_id: uuid.UUID,
    payload: StageCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Add a new stage to an application."""
    stage = svc.add_stage(
        user_id=current_user.id,
        app_id=app_id,
        name=payload.name,
        scheduled_at=payload.scheduled_at,
        outcome=payload.outcome,
        notes=payload.notes
    )
    
    # Best-effort WebSocket broadcast
    broadcast_event("stage_added", str(app_id))
    
    return StageOut(**stage.__dict__)


@router.get("/{app_id}/stages", response_model=List[StageOut])
def list_stages(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """List all stages for an application."""
    items = svc.list_stages(user_id=current_user.id, app_id=app_id)
    return [StageOut(**i.__dict__) for i in items]


@router.patch("/{app_id}/stages/{stage_id}", response_model=StageOut)
def update_stage_partial(
    app_id: uuid.UUID,
    stage_id: uuid.UUID,
    payload: StageUpdate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """Update a stage (partial update)."""
    try:
        s = svc.update_stage_partial(
            user_id=current_user.id,
            app_id=app_id,
            stage_id=stage_id,
            name=payload.name,
            scheduled_at=payload.scheduled_at,
            outcome=payload.outcome,
            notes=payload.notes
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Best-effort WebSocket broadcast
    broadcast_event("stage_updated", str(app_id))
    
    return StageOut(**s.__dict__)


@router.delete("/{app_id}/stages/{stage_id}")
def delete_stage(
    app_id: uuid.UUID,
    stage_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a stage from an application."""
    try:
        svc.delete_stage(
            user_id=current_user.id,
            app_id=app_id,
            stage_id=stage_id
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Best-effort WebSocket broadcast
    broadcast_event("stage_deleted", str(app_id))
    
    return {"success": True}
