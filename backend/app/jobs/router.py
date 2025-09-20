from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..auth.deps import get_current_user
from ..core.pagination import (
    PaginatedResponse,
    PaginationParams,
    apply_sorting,
)
from ..db import models
from ..db.session import get_db
from .schemas import JobCreate, JobOut, JobSearchOut, ManualJobCreate
from ..core.search import search_service

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobOut)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a job, creating the company if needed."""
    company_id: Optional[uuid.UUID] = payload.company_id

    if not company_id and payload.company_name:
        company = db.execute(
            select(models.Company).where(models.Company.name == payload.company_name)
        ).scalar_one_or_none()
        if not company:
            company = models.Company(
                name=payload.company_name,
                website=payload.website,
                location=payload.location,
            )
            db.add(company)
            db.flush()
        company_id = company.id

    job = models.Job(
        user_id=current_user.id,
        company_id=company_id,
        source_url=payload.source_url,
        title=payload.title,
        location=payload.location,
        remote_type=payload.remote_type,
        job_type=payload.job_type,
        description=payload.description,
        requirements=(payload.requirements or []),
        skills=(payload.skills or []),
    )

    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=PaginatedResponse[JobOut])
def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    q: str = Query("", description="Full-text search for title/description"),
    location: str = Query("", description="Filter by location"),
    remote_type: str = Query("", description="Filter by remote type"),
    company: str = Query("", description="Filter by company name"),
    sort: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    List jobs with pagination, optional full-text search, and filters.
    For q!= '', use the search service; otherwise do a normal DB query.
    """
    params = PaginationParams(page=page, page_size=page_size, q=q, sort=sort, order=order)

    # Full-text search path
    if q.strip():
        filters = {"user_id": str(current_user.id)}
        if location:
            filters["location"] = location
        if remote_type:
            filters["remote_type"] = remote_type
        if company:
            filters["company"] = company

        offset = (page - 1) * page_size
        jobs_data = search_service.search_jobs(
            db=db, query_text=q, limit=page_size, offset=offset, filters=filters
        )
        total = search_service.count_search_results(db, q, filters)

        items: list[JobOut] = []
        for doc in jobs_data:
            items.append(
                JobOut(
                    id=uuid.UUID(doc["id"]),
                    title=doc["title"],
                    description=doc.get("description"),
                    location=doc.get("location"),
                    remote_type=doc.get("remote_type"),
                    job_type=doc.get("job_type", ""),
                    requirements=doc.get("requirements", []),
                    skills=doc.get("skills", []),
                    source_url=doc.get("source_url"),
                    created_at=doc["created_at"],
                    company_id=None,  # index may omit this
                    company_name=doc.get("company_name"),
                    website=doc.get("company_website"),
                )
            )

        pages = (total + page_size - 1) // page_size
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        )

    # Plain SQL path (no search)
    base = (
        select(
            models.Job,
            models.Company.name.label("company_name"),
            models.Company.website.label("company_website"),
        )
        .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
        .where(models.Job.user_id == current_user.id)
    )

    if location:
        base = base.where(models.Job.location.ilike(f"%{location}%"))
    if remote_type:
        base = base.where(models.Job.remote_type == remote_type)
    if company:
        base = base.where(models.Company.name.ilike(f"%{company}%"))

    # Sorting (applies on Job.* fields)
    base = apply_sorting(base, models.Job, params.sort, params.order)

    # Pagination
    offset = (params.page - 1) * params.page_size
    rows = db.execute(base.offset(offset).limit(params.page_size)).all()

    # Total (match same filters; join only if needed)
    total_q = select(func.count(models.Job.id)).where(models.Job.user_id == current_user.id)
    if location:
        total_q = total_q.where(models.Job.location.ilike(f"%{location}%"))
    if remote_type:
        total_q = total_q.where(models.Job.remote_type == remote_type)
    if company:
        total_q = (
            total_q.join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
            .where(models.Company.name.ilike(f"%{company}%"))
        )
    total = db.execute(total_q).scalar() or 0
    pages = (params.page_size and (total + params.page_size - 1) // params.page_size) or 1

    items: list[JobOut] = []
    for job, company_name, company_website in rows:
        items.append(
            JobOut(
                id=job.id,
                title=job.title,
                company_id=job.company_id,
                company_name=company_name,
                website=company_website,
                location=job.location,
                remote_type=job.remote_type,
                job_type=job.job_type,
                description=job.description,
                requirements=job.requirements,
                skills=job.skills,
                source_url=job.source_url,
                created_at=job.created_at,
            )
        )

    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
        pages=pages,
        has_next=params.page < pages,
        has_prev=params.page > 1,
    )


@router.get("/search", response_model=PaginatedResponse[JobSearchOut])
def search_jobs(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    location: str = Query("", description="Filter by location"),
    remote_type: str = Query("", description="Filter by remote type"),
    company: str = Query("", description="Filter by company"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Advanced full-text search with relevance. Restricted to the current user.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query is required")

    filters: dict[str, str] = {"user_id": str(current_user.id)}
    if location:
        filters["location"] = location
    if remote_type:
        filters["remote_type"] = remote_type
    if company:
        filters["company"] = company

    offset = (page - 1) * page_size
    hits = search_service.search_jobs(
        db=db, query_text=q, limit=page_size, offset=offset, filters=filters
    )
    total = search_service.count_search_results(db, q, filters)

    items = [JobSearchOut(**h) for h in hits]
    pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1,
    )


@router.get("/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return search suggestions for the current user."""
    suggestions = search_service.suggest_search_terms(db, q, user_id=str(current_user.id))
    return {"suggestions": suggestions}


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch a single job owned by the current user."""
    row = db.execute(
        select(
            models.Job,
            models.Company.name.label("company_name"),
            models.Company.website.label("company_website"),
        )
        .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
        .where(models.Job.id == job_id, models.Job.user_id == current_user.id)
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    job, company_name, company_website = row
    return JobOut(
        id=job.id,
        title=job.title,
        company_id=job.company_id,
        company_name=company_name,
        website=company_website,
        location=job.location,
        remote_type=job.remote_type,
        job_type=job.job_type,
        description=job.description,
        requirements=job.requirements,
        skills=job.skills,
        source_url=job.source_url,
        created_at=job.created_at,
    )


@router.post("/extension", response_model=JobOut)
def create_job_from_extension(
    payload: ManualJobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a job via the browser extension (manual fields)."""
    company = db.execute(
        select(models.Company).where(models.Company.name == payload.company_name)
    ).scalar_one_or_none()
    if not company:
        company = models.Company(
            name=payload.company_name, website=None, location=payload.location
        )
        db.add(company)
        db.flush()

    # optional: format description with bullets/skills (kept consistent w/ manual)
    desc_parts: list[str] = []
    if payload.description:
        desc_parts.append(payload.description)

    if payload.requirements:
        req_lines = [f"• {r.strip()}" for r in payload.requirements if r and r.strip()]
        if req_lines:
            desc_parts.append("\n\n**Requirements:**\n" + "\n".join(req_lines))

    if payload.skills:
        skills_text = ", ".join([s.strip() for s in payload.skills if s and s.strip()])
        if skills_text:
            desc_parts.append("\n\n**Required Skills:**\n" + skills_text)

    final_description = "\n".join(desc_parts) if desc_parts else None

    job = models.Job(
        user_id=current_user.id,
        company_id=company.id,
        title=payload.title,
        location=payload.location,
        remote_type=payload.remote_type,
        job_type=payload.job_type,
        description=final_description,
        requirements=(payload.requirements or []),
        skills=(payload.skills or []),
        source_url=payload.source_url,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.post("/manual", response_model=JobOut)
def create_manual_job(
    payload: ManualJobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a job manually (available for all users)."""
    company = db.execute(
        select(models.Company).where(models.Company.name == payload.company_name)
    ).scalar_one_or_none()
    if not company:
        company = models.Company(
            name=payload.company_name, website=None, location=payload.location
        )
        db.add(company)
        db.flush()

    desc_parts: list[str] = []
    if payload.description:
        desc_parts.append(payload.description)

    if payload.requirements:
        req_lines = [f"• {r.strip()}" for r in payload.requirements if r and r.strip()]
        if req_lines:
            desc_parts.append("\n\n**Requirements:**\n" + "\n".join(req_lines))

    if payload.skills:
        skills_text = ", ".join([s.strip() for s in payload.skills if s and s.strip()])
        if skills_text:
            desc_parts.append("\n\n**Required Skills:**\n" + skills_text)

    final_description = "\n".join(desc_parts) if desc_parts else None

    job = models.Job(
        user_id=current_user.id,
        company_id=company.id,
        title=payload.title,
        location=payload.location,
        remote_type=payload.remote_type,
        job_type=payload.job_type,
        description=final_description,
        requirements=(payload.requirements or []),
        skills=(payload.skills or []),
        source_url=payload.source_url,
    )

    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: uuid.UUID,
    payload: ManualJobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update an existing job (only for jobs owned by the current user)."""
    job = db.execute(
        select(models.Job).where(
            models.Job.id == job_id, models.Job.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")

    company = db.execute(
        select(models.Company).where(models.Company.name == payload.company_name)
    ).scalar_one_or_none()
    if not company:
        company = models.Company(
            name=payload.company_name, website=None, location=payload.location
        )
        db.add(company)
        db.flush()

    desc_parts: list[str] = []
    if payload.description:
        desc_parts.append(payload.description)

    if payload.requirements:
        req_lines = [f"• {r.strip()}" for r in payload.requirements if r and r.strip()]
        if req_lines:
            desc_parts.append("\n\n**Requirements:**\n" + "\n".join(req_lines))

    if payload.skills:
        skills_text = ", ".join([s.strip() for s in payload.skills if s and s.strip()])
        if skills_text:
            desc_parts.append("\n\n**Required Skills:**\n" + skills_text)

    final_description = "\n".join(desc_parts) if desc_parts else None

    job.company_id = company.id
    job.title = payload.title
    job.location = payload.location
    job.remote_type = payload.remote_type
    job.source_url = payload.source_url
    if getattr(payload, "job_type", None) is not None:
        job.job_type = payload.job_type
    job.description = final_description

    if payload.requirements is not None:
        job.requirements = [r for r in payload.requirements if r and r.strip()]
    if payload.skills is not None:
        job.skills = [s for s in payload.skills if s and s.strip()]

    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}")
def delete_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a job and its dependent rows (owned by current user)."""
    job = db.execute(
        select(models.Job).where(
            models.Job.id == job_id, models.Job.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")

    # Delete applications and their dependencies
    apps = db.execute(
        select(models.Application).where(models.Application.job_id == job_id)
    ).scalars().all()

    for app in apps:
        db.execute(
            delete(models.ApplicationAttachment).where(
                models.ApplicationAttachment.application_id == app.id
            )
        )
        db.execute(delete(models.Stage).where(models.Stage.application_id == app.id))
        db.execute(delete(models.Note).where(models.Note.application_id == app.id))
        db.delete(app)

    # Delete match results for this job
    db.execute(delete(models.MatchResult).where(models.MatchResult.job_id == job_id))

    # Finally the job
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}
