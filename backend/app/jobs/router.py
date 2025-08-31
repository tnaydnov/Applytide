from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_db
from ..db import models
from .schemas import JobCreate, JobOut, ScrapeIn
from .scraper import scrape_job

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("", response_model=JobOut)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    # Ensure company exists (either by id, or create by name if provided)
    company_id: Optional[uuid.UUID] = payload.company_id
    if not company_id and payload.company_name:
        company = db.execute(select(models.Company).where(models.Company.name == payload.company_name)).scalar_one_or_none()
        if not company:
            company = models.Company(name=payload.company_name, website=payload.website, location=payload.location)
            db.add(company)
            db.flush()  # get generated id without full commit
        company_id = company.id

    job = models.Job(
        company_id=company_id,
        source_url=payload.source_url,
        title=payload.title,
        location=payload.location,
        remote_type=payload.remote_type,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        description=payload.description,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.get("", response_model=List[JobOut])
def list_jobs(q: str | None = Query(default=None, description="search in title"),
              db: Session = Depends(get_db)):
    stmt = select(models.Job).order_by(models.Job.created_at.desc())
    if q:
        stmt = stmt.where(models.Job.title.ilike(f"%{q}%"))
    items = db.execute(stmt).scalars().all()
    return items

@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/scrape", response_model=JobCreate)
def scrape(payload: ScrapeIn):
    """
    Fetch a job page and return a JobCreate-like payload you can edit before creating.
    """
    return JobCreate(**scrape_job(payload.url))
