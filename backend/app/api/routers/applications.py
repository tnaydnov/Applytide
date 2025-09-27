from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse

from ...db import models
from ...api.deps_auth import get_current_user
from ...api.utils.pagination import PaginationParams, PaginatedResponse
from .ws import broadcast

from ..schemas.applications import (
    ApplicationCreate, ApplicationOut, ApplicationUpdate,
    StageCreate, StageOut, NoteCreate, NoteOut,
    ApplicationCard, JobMini, ApplicationDetail, JobDetailMini,
    AttachmentOut, StageUpdate
)
from ...domain.applications.service import ApplicationService
from ..deps import get_application_service

router = APIRouter(prefix="/api/applications", tags=["applications"])

def _paginate(total: int, page: int, page_size: int):
    pages = (total + page_size - 1) // page_size if total > 0 else 1
    return pages, page < pages, page > 1

# ---------- applications ----------
@router.post("", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    try:
        dto = svc.create_or_update(
            user_id=current_user.id,
            job_id=payload.job_id,
            resume_id=payload.resume_id,
            status=payload.status,
            source=payload.source,
        )
    except Exception as e:
        from ...domain.applications.errors import BadRequest
        if isinstance(e, BadRequest):
            raise HTTPException(status_code=400, detail=e.detail)
        raise
    return ApplicationOut(**dto.__dict__)

@router.get("", response_model=PaginatedResponse[ApplicationOut])
def list_applications(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None), q: str = Query(""),
    sort: str = Query("created_at"), order: str = Query("desc"),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    items, total = svc.list_paginated(
        user_id=current_user.id, status=status or None, q=q or "",
        sort=sort, order=order, page=page, page_size=page_size
    )
    pages, has_next, has_prev = _paginate(total, page, page_size)
    return PaginatedResponse(
        items=[ApplicationOut(**i.__dict__) for i in items],
        total=total, page=page, page_size=page_size, pages=pages,
        has_next=has_next, has_prev=has_prev,
    )

@router.get("/statuses", response_model=List[str])
def get_used_statuses(
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    return svc.get_used_statuses(user_id=current_user.id)

@router.get("/cards", response_model=List[ApplicationCard])
def list_cards(
    status: Optional[str] = Query(None),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    rows = svc.list_cards(user_id=current_user.id, status=status)
    return [
        ApplicationCard(
            id=r.id, status=r.status, resume_id=r.resume_id,
            created_at=r.created_at, updated_at=r.updated_at,
            job=JobMini(id=r.job_id, title=r.title, company_name=r.company_name)
        ) for r in rows
    ]

@router.get("/with-stages", response_model=List[dict])
def list_applications_with_stages(
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    return svc.list_with_stages(user_id=current_user.id)

@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    try:
        dto = svc.get_owned_app(app_id=app_id, user_id=current_user.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")
    return ApplicationOut(**dto.__dict__)

@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: uuid.UUID,
    payload: ApplicationUpdate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    app = svc.update_status(user_id=current_user.id, app_id=app_id, new_status=payload.status)
    # best-effort WS broadcast
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_changed", "application_id": str(app.id), "status": app.status})
    except Exception:
        pass
    return ApplicationOut(**app.__dict__)

@router.delete("/{app_id}")
def delete_application(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    svc.delete(user_id=current_user.id, app_id=app_id)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "application_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    return {"message": "Application deleted successfully"}

# ---------- stages ----------
@router.post("/{app_id}/stages", response_model=StageOut)
def add_stage(
    app_id: uuid.UUID, payload: StageCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    stage = svc.add_stage(user_id=current_user.id, app_id=app_id, name=payload.name, scheduled_at=payload.scheduled_at, outcome=payload.outcome, notes=payload.notes)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_added", "application_id": str(app_id)})
    except Exception:
        pass
    return StageOut(**stage.__dict__)

@router.get("/{app_id}/stages", response_model=List[StageOut])
def list_stages(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
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
    try:
        s = svc.update_stage_partial(
            user_id=current_user.id, app_id=app_id, stage_id=stage_id,
            name=payload.name, scheduled_at=payload.scheduled_at, outcome=payload.outcome, notes=payload.notes
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Stage not found")
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_updated", "application_id": str(app_id)})
    except Exception:
        pass
    return StageOut(**s.__dict__)

@router.delete("/{app_id}/stages/{stage_id}")
def delete_stage(
    app_id: uuid.UUID,
    stage_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    try:
        svc.delete_stage(user_id=current_user.id, app_id=app_id, stage_id=stage_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Stage not found")
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    return {"success": True}

# ---------- notes ----------
@router.post("/{app_id}/notes", response_model=NoteOut)
def add_note(
    app_id: uuid.UUID,
    payload: NoteCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    n = svc.add_note(user_id=current_user.id, app_id=app_id, body=payload.body)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "note_added", "application_id": str(app_id)})
    except Exception:
        pass
    return NoteOut(**n.__dict__)

@router.get("/{app_id}/notes", response_model=List[NoteOut])
def list_notes(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    items = svc.list_notes(user_id=current_user.id, app_id=app_id)
    return [NoteOut(**i.__dict__) for i in items]

# ---------- detail ----------
@router.get("/{app_id}/detail", response_model=ApplicationDetail)
def get_detail(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    app, job, company_name, company_website, resume_label, stages, notes, attachments = svc.get_detail(user_id=current_user.id, app_id=app_id)
    job_detail = (
        JobDetailMini(
            id=job.id, title=job.title,
            company_name=job.company_name, company_website=job.company_website,
            location=job.location, source_url=job.source_url, description=job.description
        ) if job else JobDetailMini(
            id=app.job_id, title="(missing)",
            company_name=None, company_website=None, location=None, source_url=None, description=None
        )
    )
    return ApplicationDetail(
        application=ApplicationOut(**app.__dict__),
        job=job_detail,
        resume_label=resume_label,
        stages=[StageOut(**s.__dict__) for s in stages],
        notes=[NoteOut(**n.__dict__) for n in notes],
        attachments=[AttachmentOut(**a.__dict__) for a in attachments],
    )

# ---------- attachments ----------
@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: dict,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    a = svc.attach_from_document(
        user_id=current_user.id, app_id=app_id,
        document_id=str(payload.get("document_id")),
        document_type=(payload.get("document_type") or "other"),
    )
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_added", "application_id": str(app_id)})
    except Exception:
        pass
    return AttachmentOut(**a.__dict__)

@router.post("/{app_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    app_id: uuid.UUID,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form("other"),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    a = await svc.upload_attachment(user_id=current_user.id, app_id=app_id, file=file, document_type=document_type)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_added", "application_id": str(app_id)})
    except Exception:
        pass
    return AttachmentOut(**a.__dict__)

@router.get("/{app_id}/attachments", response_model=List[AttachmentOut])
def list_attachments(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    items = svc.list_attachments(user_id=current_user.id, app_id=app_id)
    return [AttachmentOut(**i.__dict__) for i in items]

@router.get("/{app_id}/attachments/{attachment_id}/download")
def download_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    a = svc.get_attachment(user_id=current_user.id, app_id=app_id, attachment_id=attachment_id)
    return FileResponse(path=a.file_path, filename=a.filename, media_type=a.content_type)

@router.delete("/{app_id}/attachments/{attachment_id}")
def delete_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    svc.delete_attachment(user_id=current_user.id, app_id=app_id, attachment_id=attachment_id)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    return {"message": "Attachment deleted successfully"}
