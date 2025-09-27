# backend/app/applications/service.py
from __future__ import annotations
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import HTTPException, UploadFile
from sqlalchemy import select, func, or_, join
from sqlalchemy.orm import Session

from ..db import models
from ..db.models import User
from ..core.pagination import (
    PaginationParams, PaginatedResponse,
    paginate_query, apply_sorting
)
from ..documents.service import DocumentService

UTC = timezone.utc
ATTACH_UPLOAD_DIR = Path("app/uploads/app_attachments")
document_service = DocumentService()


# ------- helpers -------
def get_owned_app(db: Session, app_id: uuid.UUID, user_id: uuid.UUID) -> models.Application:
    row = db.get(models.Application, app_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Application not found")
    return row

def ensure_job_resume(db: Session, job_id: uuid.UUID, resume_id: Optional[uuid.UUID]):
    if not db.get(models.Job, job_id):
        raise HTTPException(status_code=400, detail="job_id not found")
    if resume_id and not db.get(models.Resume, resume_id):
        raise HTTPException(status_code=400, detail="resume_id not found")


# ------- applications -------
def create_or_update_application(
    db: Session, user: User, job_id: uuid.UUID, resume_id: Optional[uuid.UUID], status: Optional[str], source: Optional[str] = None
) -> models.Application:
    ensure_job_resume(db, job_id, resume_id)

    existing = db.execute(
        select(models.Application).where(
            models.Application.user_id == user.id,
            models.Application.job_id == job_id
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if existing:
        existing.status = status or "Applied"
        existing.resume_id = resume_id
        existing.source = source
        existing.updated_at = now
        db.commit(); db.refresh(existing)
        return existing

    row = models.Application(
        user_id=user.id, job_id=job_id, resume_id=resume_id,
        status=status or "Applied", source=source,
        created_at=now, updated_at=now
    )
    db.add(row); db.commit(); db.refresh(row)
    return row

def paginate_applications(
    db: Session, user: User, params: PaginationParams, status: Optional[str]
) -> PaginatedResponse[models.Application]:
    query = select(models.Application).join(
        models.Job, models.Application.job_id == models.Job.id
    ).join(
        models.Company, models.Job.company_id == models.Company.id, isouter=True
    ).where(models.Application.user_id == user.id)

    if status:
        query = query.filter(models.Application.status == status)

    if params.q.strip():
        search_term = f"%{params.q}%"
        query = query.filter(
            or_(models.Job.title.ilike(search_term),
                models.Company.name.ilike(search_term))
        )

    query = apply_sorting(query, models.Application, params.sort, params.order)

    total_query = select(func.count(models.Application.id)).join(
        models.Job, models.Application.job_id == models.Job.id
    ).join(
        models.Company, models.Job.company_id == models.Company.id, isouter=True
    ).where(models.Application.user_id == user.id)

    if status:
        total_query = total_query.filter(models.Application.status == status)
    if params.q.strip():
        search_term = f"%{params.q}%"
        total_query = total_query.filter(
            or_(models.Job.title.ilike(search_term),
                models.Company.name.ilike(search_term))
        )

    return PaginatedResponse(**paginate_query(query, params, total_query, db))

def get_used_statuses(db: Session, user: User) -> List[str]:
    stmt = select(models.Application.status).where(
        models.Application.user_id == user.id
    ).distinct().order_by(models.Application.status)
    return list(db.execute(stmt).scalars().all())

def list_cards(db: Session, user: User, status: Optional[str]):
    j = join(models.Application, models.Job, models.Application.job_id == models.Job.id)
    j = join(j, models.Company, models.Job.company_id == models.Company.id, isouter=True)
    stmt = (
        select(
            models.Application.id, models.Application.status, models.Application.resume_id,
            models.Application.created_at, models.Application.updated_at,
            models.Job.id.label("job_id"), models.Job.title, models.Company.name.label("company_name")
        )
        .select_from(j)
        .where(models.Application.user_id == user.id)
        .order_by(models.Application.created_at.desc())
    )
    if status:
        stmt = stmt.where(models.Application.status == status)
    return db.execute(stmt).all()

def update_application_status(db: Session, user: User, app_id: uuid.UUID, new_status: str) -> models.Application:
    app = get_owned_app(db, app_id, user.id)

    new_status = (new_status or app.status)
    if new_status == "Saved":
        new_status = "Applied"

    if app.status != new_status:
        db.add(models.Stage(
            application_id=app_id,
            name=new_status,
            notes=f"Status changed from {app.status} to {new_status}",
        ))

    app.status = new_status
    app.updated_at = datetime.now(UTC)
    db.add(app); db.commit(); db.refresh(app)
    return app

def delete_application(db: Session, user: User, app_id: uuid.UUID):
    app = get_owned_app(db, app_id, user.id)
    db.execute(models.Note.__table__.delete().where(models.Note.application_id == app_id))
    db.execute(models.Stage.__table__.delete().where(models.Stage.application_id == app_id))
    db.execute(models.ApplicationAttachment.__table__.delete().where(models.ApplicationAttachment.application_id == app_id))
    db.delete(app)
    db.commit()


# ------- stages -------
def add_stage(
    db: Session, user: User, app_id: uuid.UUID, name: str, scheduled_at=None, outcome=None, notes=None
) -> models.Stage:
    get_owned_app(db, app_id, user.id)
    stage = models.Stage(
        application_id=app_id,
        name=("Applied" if name == "Saved" else name),
        scheduled_at=scheduled_at, outcome=outcome, notes=notes
    )
    db.add(stage); db.commit(); db.refresh(stage)
    return stage

def list_stages(db: Session, user: User, app_id: uuid.UUID) -> list[models.Stage]:
    get_owned_app(db, app_id, user.id)
    stmt = select(models.Stage).where(models.Stage.application_id == app_id).order_by(models.Stage.created_at.asc())
    return db.execute(stmt).scalars().all()

def update_stage_partial(
    db: Session, user: User, app_id: uuid.UUID, stage_id: uuid.UUID,
    *, name=None, scheduled_at=None, outcome=None, notes=None
) -> models.Stage:
    get_owned_app(db, app_id, user.id)
    stmt = select(models.Stage).where(
        models.Stage.id == stage_id, models.Stage.application_id == app_id
    )
    stage = db.execute(stmt).scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    if name is not None:
        stage.name = name
    if scheduled_at is not None:
        stage.scheduled_at = scheduled_at
    if outcome is not None:
        stage.outcome = outcome
    if notes is not None:
        stage.notes = notes

    db.add(stage); db.commit(); db.refresh(stage)
    return stage

def delete_stage(db: Session, user: User, app_id: uuid.UUID, stage_id: uuid.UUID):
    get_owned_app(db, app_id, user.id)
    stmt = select(models.Stage).where(
        models.Stage.id == stage_id, models.Stage.application_id == app_id
    )
    stage = db.execute(stmt).scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    db.delete(stage); db.commit()


# ------- notes -------
def add_note(db: Session, user: User, app_id: uuid.UUID, body: str) -> models.Note:
    get_owned_app(db, app_id, user.id)
    n = models.Note(application_id=app_id, body=body)
    db.add(n); db.commit(); db.refresh(n)
    return n

def list_notes(db: Session, user: User, app_id: uuid.UUID) -> list[models.Note]:
    get_owned_app(db, app_id, user.id)
    stmt = select(models.Note).where(models.Note.application_id == app_id).order_by(models.Note.created_at.asc())
    return db.execute(stmt).scalars().all()


# ------- list-with-stages + detail -------
def list_with_stages(db: Session, user: User):
    apps = db.execute(
        select(models.Application)
        .where(models.Application.user_id == user.id)
        .order_by(models.Application.created_at.desc())
    ).scalars().all()

    out = []
    for app in apps:
        job = db.get(models.Job, app.job_id)
        if not job:
            continue
        company = db.get(models.Company, job.company_id) if job.company_id else None
        stages = db.execute(
            select(models.Stage).where(models.Stage.application_id == app.id).order_by(models.Stage.created_at.asc())
        ).scalars().all()
        out.append({
            "id": app.id,
            "status": app.status,
            "created_at": app.created_at,
            "updated_at": app.updated_at,
            "job": {
                "id": job.id,
                "title": job.title,
                "company_name": company.name if company else None,
                "location": job.location,
                "source_url": job.source_url
            },
            "stages": [
                {
                    "id": s.id, "name": s.name, "scheduled_at": s.scheduled_at,
                    "outcome": s.outcome, "notes": s.notes,
                    "created_at": s.created_at, "application_id": s.application_id
                } for s in stages
            ]
        })
    return out

def get_detail(db: Session, user: User, app_id: uuid.UUID):
    app = get_owned_app(db, app_id, user.id)
    job = db.get(models.Job, app.job_id)

    company_name = company_website = None
    if job and job.company_id:
        comp = db.get(models.Company, job.company_id)
        if comp:
            company_name, company_website = comp.name, comp.website

    resume_label = None
    if app.resume_id:
        res = db.get(models.Resume, app.resume_id)
        resume_label = res.label if res else None

    stages = db.execute(
        select(models.Stage).where(models.Stage.application_id == app_id).order_by(models.Stage.created_at.asc())
    ).scalars().all()

    notes = db.execute(
        select(models.Note).where(models.Note.application_id == app_id).order_by(models.Note.created_at.asc())
    ).scalars().all()

    attachments = db.execute(
        select(models.ApplicationAttachment)
        .where(models.ApplicationAttachment.application_id == app_id)
        .order_by(models.ApplicationAttachment.created_at.asc())
    ).scalars().all()

    return app, job, company_name, company_website, resume_label, stages, notes, attachments


# ------- attachments -------
def attach_from_document(
    db: Session, user: User, app_id: uuid.UUID, document_id: str, document_type: Optional[str]
) -> models.ApplicationAttachment:
    get_owned_app(db, app_id, user.id)
    src_path, filename, media_type = document_service.resolve_download(
        db=db, user_id=str(user.id), document_id=document_id
    )
    if not src_path.exists():
        raise HTTPException(status_code=404, detail="Source document file not found")

    ATTACH_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dst_path = ATTACH_UPLOAD_DIR / f"{uuid.uuid4()}{src_path.suffix}"
    dst_path.write_bytes(src_path.read_bytes())
    size = dst_path.stat().st_size

    a = models.ApplicationAttachment(
        application_id=app_id,
        filename=filename or "document",
        file_size=size,
        content_type=media_type or "application/octet-stream",
        file_path=str(dst_path),
        document_type=document_type or "other",
    )
    db.add(a); db.commit(); db.refresh(a)
    return a

async def upload_attachment(
    db: Session, user: User, app_id: uuid.UUID, file: UploadFile, document_type: Optional[str]
) -> models.ApplicationAttachment:
    get_owned_app(db, app_id, user.id)

    MAX = 10 * 1024 * 1024
    ATTACH_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    dst = ATTACH_UPLOAD_DIR / f"{uuid.uuid4()}{Path(file.filename or '').suffix}"
    total = 0
    try:
        with open(dst, "wb") as buf:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX:
                    raise HTTPException(status_code=413, detail="File too large (max 10MB)")
                buf.write(chunk)
    except Exception:
        dst.unlink(missing_ok=True)
        raise

    a = models.ApplicationAttachment(
        application_id=app_id,
        filename=file.filename or "unknown",
        file_size=total,
        content_type=file.content_type or "application/octet-stream",
        file_path=str(dst),
        document_type=(document_type or "other"),
    )
    db.add(a); db.commit(); db.refresh(a)
    return a

def list_attachments(db: Session, user: User, app_id: uuid.UUID):
    get_owned_app(db, app_id, user.id)
    stmt = select(models.ApplicationAttachment).where(
        models.ApplicationAttachment.application_id == app_id
    ).order_by(models.ApplicationAttachment.created_at.desc())
    return db.execute(stmt).scalars().all()

def get_attachment(db: Session, user: User, app_id: uuid.UUID, attachment_id: uuid.UUID) -> models.ApplicationAttachment:
    get_owned_app(db, app_id, user.id)
    a = db.get(models.ApplicationAttachment, attachment_id)
    if not a or a.application_id != app_id:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return a

def delete_attachment(db: Session, user: User, app_id: uuid.UUID, attachment_id: uuid.UUID):
    a = get_attachment(db, user, app_id, attachment_id)
    Path(a.file_path).unlink(missing_ok=True)
    db.delete(a); db.commit()
