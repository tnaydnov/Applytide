from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, join, func, or_
from ..db.session import get_db
from ..db import models
from .schemas import (
    ApplicationCreate, ApplicationOut, ApplicationUpdate,
    StageCreate, StageOut, NoteCreate, NoteOut,
    ApplicationCard, JobMini, ApplicationDetail
)
from ..ws.router import broadcast
from ..auth.deps import get_current_user
from ..db.models import User
from ..core.pagination import PaginationParams, PaginatedResponse, paginate_query, apply_sorting

router = APIRouter(prefix="/applications", tags=["applications"])

def _ensure_job_resume(db: Session, job_id: uuid.UUID, resume_id: uuid.UUID | None):
    if not db.get(models.Job, job_id):
        raise HTTPException(status_code=400, detail="job_id not found")
    if resume_id and not db.get(models.Resume, resume_id):
        raise HTTPException(status_code=400, detail="resume_id not found")

@router.post("", response_model=ApplicationOut)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_job_resume(db, payload.job_id, payload.resume_id)
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


# ---------- Cards (job title + company) ----------
@router.get("/cards", response_model=List[ApplicationCard])
def list_cards(status: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # join applications -> jobs -> companies
    j = join(models.Application, models.Job, models.Application.job_id == models.Job.id)
    j = join(j, models.Company, models.Job.company_id == models.Company.id, isouter=True)
    stmt = select(
        models.Application.id, models.Application.status, models.Application.resume_id,
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
            job=JobMini(id=r.job_id, title=r.title, company_name=r.company_name)
        ))
    return out

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
    row.status = payload.status
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
        name=payload.name,
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
    company_name = None
    if job and job.company_id:
        comp = db.get(models.Company, job.company_id)
        company_name = comp.name if comp else None
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
    return ApplicationDetail(
        application=app,
        job=JobMini(id=job.id, title=job.title, company_name=company_name) if job else JobMini(id=app.job_id, title="(missing)", company_name=None),
        resume_label=resume_label,
        stages=stages,
        notes=notes,
    )


def _get_owned_app(db: Session, app_id: uuid.UUID, user_id: uuid.UUID) -> models.Application | None:
    row = db.get(models.Application, app_id)
    if not row or row.user_id != user_id:
        return None
    return row
