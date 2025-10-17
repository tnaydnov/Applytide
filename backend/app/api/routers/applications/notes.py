"""Note management endpoints for applications."""
from __future__ import annotations
import uuid
from typing import List
from fastapi import APIRouter, Depends
from ...deps_auth import get_current_user
from ....db import models
from ..schemas.applications import NoteCreate, NoteOut
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import broadcast_event

router = APIRouter()


@router.post("/{app_id}/notes", response_model=NoteOut)
def add_note(
    app_id: uuid.UUID,
    payload: NoteCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Add a note to an application."""
    n = svc.add_note(
        user_id=current_user.id,
        app_id=app_id,
        body=payload.body
    )
    
    # Best-effort WebSocket broadcast
    broadcast_event("note_added", str(app_id))
    
    return NoteOut(**n.__dict__)


@router.get("/{app_id}/notes", response_model=List[NoteOut])
def list_notes(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """List all notes for an application."""
    items = svc.list_notes(user_id=current_user.id, app_id=app_id)
    return [NoteOut(**i.__dict__) for i in items]
