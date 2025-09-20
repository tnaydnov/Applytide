from __future__ import annotations
from pathlib import Path
import uuid
import os
import shutil
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, join, func, or_
from ..db.session import get_db
from ..db import models
from .schemas import (
    ApplicationCreate, ApplicationOut, ApplicationUpdate,
    StageCreate, StageOut, NoteCreate, NoteOut,
    ApplicationCard, JobMini, ApplicationDetail, JobDetailMini, AttachmentOut
)
from ..ws.router import broadcast
from ..auth.deps import get_current_user
from ..db.models import User
from ..core.pagination import PaginationParams, PaginatedResponse, paginate_query, apply_sorting
from ..documents.service import DocumentService


router = APIRouter(prefix="/api/applications", tags=["applications"])

def _ensure_job_resume(db: Session, job_id: uuid.UUID, resume_id: uuid.UUID | None):
    if not db.get(models.Job, job_id):
        raise HTTPException(status_code=400, detail="job_id not found")
    if resume_id and not db.get(models.Resume, resume_id):
        raise HTTPException(status_code=400, detail="resume_id not found")

@router.post("", response_model=ApplicationOut)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_job_resume(db, payload.job_id, payload.resume_id)
    
    # Check if application already exists for this user and job
    existing_app = db.execute(
        select(models.Application).where(
            models.Application.user_id == current_user.id,
            models.Application.job_id == payload.job_id
        )
    ).scalar_one_or_none()
    
    if existing_app:
        # Update existing application instead of creating duplicate
        existing_app.status = payload.status or "Applied"
        existing_app.resume_id = payload.resume_id
        existing_app.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_app)
        return existing_app
    
    # Create new application
    row = models.Application(
        user_id=current_user.id,
        job_id=payload.job_id,
        resume_id=payload.resume_id,
        status=payload.status or "Applied",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.get("", response_model=PaginatedResponse[ApplicationOut])
def list_applications(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    q: str = Query("", description="Search in job title and company name"),
    sort: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """List applications with pagination, search, and filtering"""
    params = PaginationParams(
        page=page,
        page_size=page_size,
        q=q,
        sort=sort,
        order=order
    )
    
    # Build query with joins for search
    query = select(models.Application).join(
        models.Job, models.Application.job_id == models.Job.id
    ).join(
        models.Company, models.Job.company_id == models.Company.id, isouter=True
    ).where(models.Application.user_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(models.Application.status == status)
    
    if q.strip():
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                models.Job.title.ilike(search_term),
                models.Company.name.ilike(search_term)
            )
        )
    
    # Apply sorting
    query = apply_sorting(query, models.Application, params.sort, params.order)
    
    # Get total count with same filters
    total_query = select(func.count(models.Application.id)).join(
        models.Job, models.Application.job_id == models.Job.id
    ).join(
        models.Company, models.Job.company_id == models.Company.id, isouter=True
    ).where(models.Application.user_id == current_user.id)
    
    if status:
        total_query = total_query.filter(models.Application.status == status)
    
    if q.strip():
        search_term = f"%{q}%"
        total_query = total_query.filter(
            or_(
                models.Job.title.ilike(search_term),
                models.Company.name.ilike(search_term)
            )
        )
    
    # Paginate
    result = paginate_query(query, params, total_query, db)
    
    return PaginatedResponse(**result)

@router.get("/statuses", response_model=List[str])
def get_used_statuses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all statuses currently used by user's applications"""
    stmt = select(models.Application.status).where(
        models.Application.user_id == current_user.id
    ).distinct().order_by(models.Application.status)
    statuses = db.execute(stmt).scalars().all()
    return list(statuses)

# ---------- Cards (job title + company) ----------
@router.get("/cards", response_model=List[ApplicationCard])
def list_cards(status: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # join applications -> jobs -> companies
    j = join(models.Application, models.Job, models.Application.job_id == models.Job.id)
    j = join(j, models.Company, models.Job.company_id == models.Company.id, isouter=True)
    stmt = select(
        models.Application.id, models.Application.status, models.Application.resume_id,
        models.Application.created_at, models.Application.updated_at,
        models.Job.id.label("job_id"), models.Job.title, models.Company.name.label("company_name")
    ).select_from(j).where(models.Application.user_id == current_user.id)
    if status:
        stmt = stmt.where(models.Application.status == status)
    stmt = stmt.order_by(models.Application.created_at.desc())
    rows = db.execute(stmt).all()
    out: List[ApplicationCard] = []
    for r in rows:
        out.append(ApplicationCard(
            id=r.id, status=r.status, resume_id=r.resume_id,
            created_at=r.created_at, updated_at=r.updated_at,
            job=JobMini(id=r.job_id, title=r.title, company_name=r.company_name)
        ))
    return out

@router.get("/with-stages", response_model=List[dict])
def list_applications_with_stages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all applications with their stages - useful for reminders"""
    # Get applications
    applications = db.query(models.Application).filter(
        models.Application.user_id == current_user.id
    ).order_by(models.Application.created_at.desc()).all()
    
    result = []
    for app in applications:
        # Get job for this application
        job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
        if not job:
            continue
            
        # Get company for this job (if exists)
        company = None
        if job.company_id:
            company = db.query(models.Company).filter(models.Company.id == job.company_id).first()
        
        # Get stages for this application
        stages = db.query(models.Stage).filter(
            models.Stage.application_id == app.id
        ).order_by(models.Stage.created_at.asc()).all()
        
        # Build the response
        app_data = {
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
                    "id": stage.id,
                    "name": stage.name,
                    "scheduled_at": stage.scheduled_at,
                    "outcome": stage.outcome,
                    "notes": stage.notes,
                    "created_at": stage.created_at,
                    "application_id": stage.application_id
                }
                for stage in stages
            ]
        }
        result.append(app_data)
    
    return result

@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = _get_owned_app(db, app_id, current_user.id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    return row


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: uuid.UUID, payload: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = _get_owned_app(db, app_id, current_user.id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    
    new_status = (payload.status or row.status)
    if new_status == "Saved":
        new_status = "Applied"

    # Track status change if it's different
    old_status = row.status
    if old_status != new_status:
        stage = models.Stage(
            application_id=app_id,
            name=new_status,
            notes=f"Status changed from {old_status} to {new_status}",
        )
        db.add(stage)

    row.status = new_status
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    # best-effort broadcast
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_changed", "application_id": str(row.id), "status": row.status})
    except Exception:
        pass
    return row

# ---------- stages ----------
@router.post("/{app_id}/stages", response_model=StageOut)
def add_stage(app_id: uuid.UUID, payload: StageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    stage = models.Stage(
        application_id=app_id,
        name="Applied" if payload.name == "Saved" else payload.name,
        scheduled_at=payload.scheduled_at,
        outcome=payload.outcome,
        notes=payload.notes,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_added", "application_id": str(app_id)})
    except Exception:
        pass
    return stage

@router.get("/{app_id}/stages", response_model=List[StageOut])
def list_stages(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    stmt = select(models.Stage).where(models.Stage.application_id == app_id).order_by(models.Stage.created_at.asc())
    return db.execute(stmt).scalars().all()

@router.delete("/{app_id}/stages/{stage_id}")
def delete_stage(app_id: uuid.UUID, stage_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify application ownership
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Find and delete the stage
    stmt = select(models.Stage).where(
        models.Stage.id == stage_id,
        models.Stage.application_id == app_id
    )
    stage = db.execute(stmt).scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    db.delete(stage)
    db.commit()
    
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    
    return {"success": True}

# ---------- notes ----------
@router.post("/{app_id}/notes", response_model=NoteOut)
def add_note(app_id: uuid.UUID, payload: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    n = models.Note(application_id=app_id, body=payload.body)
    db.add(n)
    db.commit()
    db.refresh(n)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "note_added", "application_id": str(app_id)})
    except Exception:
        pass
    return n

@router.get("/{app_id}/notes", response_model=List[NoteOut])
def list_notes(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    stmt = select(models.Note).where(models.Note.application_id == app_id).order_by(models.Note.created_at.asc())
    return db.execute(stmt).scalars().all()

# ---------- detail ----------
@router.get("/{app_id}/detail", response_model=ApplicationDetail)
def get_detail(app_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = _get_owned_app(db, app_id, current_user.id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.get(models.Job, app.job_id)
    
    # Get company information for enhanced job details
    company_name = None
    company_website = None
    if job and job.company_id:
        comp = db.get(models.Company, job.company_id)
        if comp:
            company_name = comp.name
            company_website = comp.website
    
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
        select(models.ApplicationAttachment).where(models.ApplicationAttachment.application_id == app_id).order_by(models.ApplicationAttachment.created_at.asc())
    ).scalars().all()
    
    # Create enhanced job details
    job_detail = JobDetailMini(
        id=job.id,
        title=job.title,
        company_name=company_name,
        company_website=company_website,
        location=job.location,
        source_url=job.source_url,
        description=job.description
    ) if job else JobDetailMini(
        id=app.job_id, 
        title="(missing)", 
        company_name=None,
        company_website=None,
        location=None,
        source_url=None,
        description=None
    )
    
    return ApplicationDetail(
        application=app,
        job=job_detail,
        resume_label=resume_label,
        stages=stages,
        notes=notes,
        attachments=attachments,
    )


def _get_owned_app(db: Session, app_id: uuid.UUID, user_id: uuid.UUID) -> models.Application | None:
    row = db.get(models.Application, app_id)
    if not row or row.user_id != user_id:
        return None
    return row


# ---------- attachments ----------
document_service = DocumentService()

class AttachFromDocumentPayload(BaseModel):
    document_id: str

@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: AttachFromDocumentPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach an existing document to an application by copying the file."""
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")

    # Resolve the source file using your DocumentService
    src_path, filename, media_type = document_service.resolve_download(
        db=db, user_id=str(current_user.id), document_id=payload.document_id
    )
    if not src_path.exists():
        raise HTTPException(status_code=404, detail="Source document file not found")

    # Destination in your attachments area
    upload_dir = Path("app/uploads/app_attachments")
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = src_path.suffix
    unique_filename = f"{uuid.uuid4()}{ext}"
    dst_path = upload_dir / unique_filename

    # Copy file
    dst_path.write_bytes(src_path.read_bytes())
    size = dst_path.stat().st_size

    # Persist attachment row
    attachment = models.ApplicationAttachment(
        application_id=app_id,
        filename=filename or "document",
        file_size=size,
        content_type=media_type or "application/octet-stream",
        file_path=str(dst_path),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    # best-effort broadcast
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_added", "application_id": str(app_id)})
    except Exception:
        pass

    return attachment


@router.post("/{app_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    app_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a file attachment for an application (10MB limit, streamed)."""
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")

    MAX = 10 * 1024 * 1024  # 10MB
    upload_dir = "app/uploads/app_attachments"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    total = 0
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX:
                    raise HTTPException(status_code=413, detail="File too large (max 10MB)")
                buffer.write(chunk)
    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    attachment = models.ApplicationAttachment(
        application_id=app_id,
        filename=file.filename or "unknown",
        file_size=total,
        content_type=file.content_type or "application/octet-stream",
        file_path=file_path,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_added", "application_id": str(app_id)})
    except Exception:
        pass

    return attachment



@router.get("/{app_id}/attachments", response_model=List[AttachmentOut])
def list_attachments(
    app_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all attachments for an application"""
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    
    stmt = select(models.ApplicationAttachment).where(
        models.ApplicationAttachment.application_id == app_id
    ).order_by(models.ApplicationAttachment.created_at.desc())
    
    return db.execute(stmt).scalars().all()


@router.get("/{app_id}/attachments/{attachment_id}/download")
def download_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download an attachment file"""
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    
    attachment = db.get(models.ApplicationAttachment, attachment_id)
    if not attachment or attachment.application_id != app_id:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type=attachment.content_type
    )


@router.delete("/{app_id}/attachments/{attachment_id}")
def delete_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an attachment"""
    if not _get_owned_app(db, app_id, current_user.id):
        raise HTTPException(status_code=404, detail="Application not found")
    
    attachment = db.get(models.ApplicationAttachment, attachment_id)
    if not attachment or attachment.application_id != app_id:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)
    
    # Delete from database
    db.delete(attachment)
    db.commit()
    
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "attachment_deleted", "application_id": str(app_id)})
    except Exception:
        pass
    
    return {"message": "Attachment deleted successfully"}
