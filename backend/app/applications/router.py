# backend/app/applications/router.py
from __future__ import annotations
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db import models
from ..db.models import User
from ..auth.deps import get_current_user
from ..core.pagination import PaginationParams, PaginatedResponse
from ..ws.router import broadcast

from .schemas import (
    ApplicationCreate, ApplicationOut, ApplicationUpdate,
    StageCreate, StageOut, NoteCreate, NoteOut,
    ApplicationCard, JobMini, ApplicationDetail, JobDetailMini,
    AttachmentOut, StageUpdate
)
from . import service

router = APIRouter(prefix="/api/applications", tags=["applications"])

# ---------- applications ----------
@router.post("", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    row = service.create_or_update_application(db, current_user, payload.job_id, payload.resume_id, payload.status, payload.source)
    return row

@router.get("", response_model=PaginatedResponse[ApplicationOut])
def list_applications(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None), q: str = Query(""),
    sort: str = Query("created_at"), order: str = Query("desc"),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    params = PaginationParams(page=page, page_size=page_size, q=q, sort=sort, order=order)
    return service.paginate_applications(db, current_user, params, status)

@router.get("/statuses", response_model=List[str])
def get_used_statuses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return service.get_used_statuses(db, current_user)

@router.get("/cards", response_model=List[ApplicationCard])
def list_cards(status: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = service.list_cards(db, current_user, status)
    return [
        ApplicationCard(
            id=r.id, status=r.status, resume_id=r.resume_id,
            created_at=r.created_at, updated_at=r.updated_at,
            job=JobMini(id=r.job_id, title=r.title, company_name=r.company_name)
        ) for r in rows
    ]

@router.get("/with-stages", response_model=List[dict])
def list_applications_with_stages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return service.list_with_stages(db, current_user)

@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return service.get_owned_app(db, app_id, current_user.id)

@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: uuid.UUID, payload: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = service.update_application_status(db, current_user, app_id, payload.status)
    # best-effort WS broadcast
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_changed", "application_id": str(app.id), "status": app.status})
    except Exception:
        pass
    return app

@router.delete("/{app_id}")
def delete_application(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service.delete_application(db, current_user, app_id)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "application_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    return {"message": "Application deleted successfully"}


# ---------- stages ----------
@router.post("/{app_id}/stages", response_model=StageOut)
def add_stage(app_id: uuid.UUID, payload: StageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stage = service.add_stage(db, current_user, app_id, payload.name, payload.scheduled_at, payload.outcome, payload.notes)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_added", "application_id": str(app_id)})
    except Exception:
        pass
    return stage

@router.get("/{app_id}/stages", response_model=List[StageOut])
def list_stages(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return service.list_stages(db, current_user, app_id)

@router.patch("/{app_id}/stages/{stage_id}", response_model=StageOut)
def update_stage_partial(
    app_id: uuid.UUID,
    stage_id: uuid.UUID,
    payload: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stage = service.update_stage_partial(
        db, current_user, app_id, stage_id,
        name=payload.name, scheduled_at=payload.scheduled_at,
        outcome=payload.outcome, notes=payload.notes
    )
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_updated", "application_id": str(app_id)})
    except Exception:
        pass
    return stage

@router.delete("/{app_id}/stages/{stage_id}")
def delete_stage(app_id: uuid.UUID, stage_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service.delete_stage(db, current_user, app_id, stage_id)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    return {"success": True}


# ---------- notes ----------
@router.post("/{app_id}/notes", response_model=NoteOut)
def add_note(app_id: uuid.UUID, payload: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = service.add_note(db, current_user, app_id, payload.body)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "note_added", "application_id": str(app_id)})
    except Exception:
        pass
    return n

@router.get("/{app_id}/notes", response_model=List[NoteOut])
def list_notes(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return service.list_notes(db, current_user, app_id)


# ---------- detail ----------
@router.get("/{app_id}/detail", response_model=ApplicationDetail)
def get_detail(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app, job, company_name, company_website, resume_label, stages, notes, attachments = service.get_detail(db, current_user, app_id)

    job_detail = (
        JobDetailMini(
            id=job.id,
            title=job.title,
            company_name=company_name,
            company_website=company_website,
            location=job.location,
            source_url=job.source_url,
            description=job.description
        ) if job else
        JobDetailMini(
            id=app.job_id, title="(missing)",
            company_name=None, company_website=None,
            location=None, source_url=None, description=None
        )
    )

    return ApplicationDetail(
        application=app,
        job=job_detail,
        resume_label=resume_label,
        stages=stages,
        notes=notes,
        attachments=attachments,
    )


# ---------- attachments ----------
@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = service.attach_from_document(
        db, current_user, app_id,
        document_id=str(payload.get("document_id")),
        document_type=payload.get("document_type") or "other"
    )
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_added", "application_id": str(app_id)})
    except Exception:
        pass
    return a

@router.post("/{app_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    app_id: uuid.UUID,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form("other"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    a = await service.upload_attachment(db, current_user, app_id, file, document_type)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_added", "application_id": str(app_id)})
    except Exception:
        pass
    return a

@router.get("/{app_id}/attachments", response_model=List[AttachmentOut])
def list_attachments(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return service.list_attachments(db, current_user, app_id)

@router.get("/{app_id}/attachments/{attachment_id}/download")
def download_attachment(app_id: uuid.UUID, attachment_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = service.get_attachment(db, current_user, app_id, attachment_id)
    return FileResponse(path=a.file_path, filename=a.filename, media_type=a.content_type)

@router.delete("/{app_id}/attachments/{attachment_id}")
def delete_attachment(app_id: uuid.UUID, attachment_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service.delete_attachment(db, current_user, app_id, attachment_id)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    return {"message": "Attachment deleted successfully"}
