from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_db
from ..db import models
from .schemas import ApplicationCreate, ApplicationOut, ApplicationUpdate, StageCreate, StageOut
from ..ws.router import broadcast

router = APIRouter(prefix="/applications", tags=["applications"])

def _ensure_job_resume(db: Session, job_id: uuid.UUID, resume_id: uuid.UUID | None):
    if not db.get(models.Job, job_id):
        raise HTTPException(status_code=400, detail="job_id not found")
    if resume_id and not db.get(models.Resume, resume_id):
        raise HTTPException(status_code=400, detail="resume_id not found")

@router.post("", response_model=ApplicationOut)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    _ensure_job_resume(db, payload.job_id, payload.resume_id)
    row = models.Application(
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

@router.get("", response_model=List[ApplicationOut])
def list_applications(status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    stmt = select(models.Application).order_by(models.Application.created_at.desc())
    if status:
        stmt = stmt.where(models.Application.status == status)
    return db.execute(stmt).scalars().all()

@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.get(models.Application, app_id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    return row

@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: uuid.UUID, payload: ApplicationUpdate, db: Session = Depends(get_db)):
    row = db.get(models.Application, app_id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    row.status = payload.status
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    try:
        import anyio
        anyio.from_thread.run(broadcast, {"type": "stage_changed", "application_id": str(row.id), "status": row.status})
    except Exception:
        pass
    return row

@router.post("/{app_id}/stages", response_model=StageOut)
def add_stage(app_id: uuid.UUID, payload: StageCreate, db: Session = Depends(get_db)):
    if not db.get(models.Application, app_id):
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
    return stage

@router.get("/{app_id}/stages", response_model=List[StageOut])
def list_stages(app_id: uuid.UUID, db: Session = Depends(get_db)):
    if not db.get(models.Application, app_id):
        raise HTTPException(status_code=404, detail="Application not found")
    stmt = select(models.Stage).where(models.Stage.application_id == app_id).order_by(models.Stage.created_at.asc())
    return db.execute(stmt).scalars().all()
