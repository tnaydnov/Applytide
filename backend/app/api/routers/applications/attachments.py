"""Attachment management endpoints for applications."""
from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from ...deps_auth import get_current_user
from ....db import models
from ..schemas.applications import AttachmentOut
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import broadcast_event

router = APIRouter()


@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: dict,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """Attach an existing document to an application."""
    a = svc.attach_from_document(
        user_id=current_user.id,
        app_id=app_id,
        document_id=str(payload.get("document_id")),
        document_type=(payload.get("document_type") or "other"),
    )
    
    # Best-effort WebSocket broadcast
    broadcast_event("attachment_added", str(app_id))
    
    return AttachmentOut(**a.__dict__)


@router.post("/{app_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    app_id: uuid.UUID,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form("other"),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a new attachment to an application."""
    a = await svc.upload_attachment(
        user_id=current_user.id,
        app_id=app_id,
        file=file,
        document_type=document_type
    )
    
    # Best-effort WebSocket broadcast
    broadcast_event("attachment_added", str(app_id))
    
    return AttachmentOut(**a.__dict__)


@router.get("/{app_id}/attachments", response_model=List[AttachmentOut])
def list_attachments(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """List all attachments for an application."""
    items = svc.list_attachments(user_id=current_user.id, app_id=app_id)
    return [AttachmentOut(**i.__dict__) for i in items]


@router.get("/{app_id}/attachments/{attachment_id}/download")
def download_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Download an attachment file."""
    a = svc.get_attachment(
        user_id=current_user.id,
        app_id=app_id,
        attachment_id=attachment_id
    )
    return FileResponse(
        path=a.file_path,
        filename=a.filename,
        media_type=a.content_type
    )


@router.delete("/{app_id}/attachments/{attachment_id}")
def delete_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """Delete an attachment from an application."""
    svc.delete_attachment(
        user_id=current_user.id,
        app_id=app_id,
        attachment_id=attachment_id
    )
    
    # Best-effort WebSocket broadcast
    broadcast_event("attachment_deleted", str(app_id))
    
    return {"message": "Attachment deleted successfully"}
