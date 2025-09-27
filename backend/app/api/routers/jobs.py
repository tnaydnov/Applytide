# backend/app/api/routers/jobs.py
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps_auth import get_current_user
from ...db import models
from ...api.utils.pagination import PaginatedResponse, PaginationParams
from ...domain.jobs.service import JobService
from ..deps import get_job_service
from ..schemas.jobs import (JobCreate, ManualJobCreate, JobOut, JobSearchOut)


router = APIRouter(prefix="/api/jobs", tags=["jobs"])

def _paginate(total: int, page: int, page_size: int):
    pages = (total + page_size - 1) // page_size if page_size else 1
    return pages, page < pages, page > 1

@router.post("", response_model=JobOut)
def create_job(
    payload: JobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    dto = svc.create_job(user_id=current_user.id, payload=payload.dict())
    return JobOut(**dto.__dict__)

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
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    params = PaginationParams(page=page, page_size=page_size, q=q, sort=sort, order=order)
    filters = {"location": location, "remote_type": remote_type, "company": company}

    items, total = svc.list_jobs(
        user_id=current_user.id,
        page=params.page,
        page_size=params.page_size,
        filters=filters,
        sort=params.sort,
        order=params.order,
        q=params.q,
    )
    pages, has_next, has_prev = _paginate(total, page, page_size)
    return PaginatedResponse(
        items=[JobOut(**i.__dict__) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev,
    )

@router.get("/search", response_model=PaginatedResponse[JobSearchOut])
def search_jobs(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    location: str = Query("", description="Filter by location"),
    remote_type: str = Query("", description="Filter by remote type"),
    company: str = Query("", description="Filter by company"),
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    filters = {"location": location, "remote_type": remote_type, "company": company}
    items, total = svc.search_jobs(
        user_id=current_user.id,
        q=q,
        page=page,
        page_size=page_size,
        filters=filters,
    )
    pages, has_next, has_prev = _paginate(total, page, page_size)
    return PaginatedResponse(
        items=[
            JobSearchOut(
                id=str(i.id),
                title=i.title,
                description=i.description,
                location=i.location,
                remote_type=i.remote_type,
                source_url=i.source_url,
                created_at=str(i.created_at),
                company_name=i.company_name,
                company_website=i.company_website,
                relevance_score=float(i.relevance_score or 0.0),
            ) for i in items
        ],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev,
    )

@router.get("/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    return {"suggestions": svc.suggest_terms(user_id=current_user.id, q=q)}

@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    try:
        dto = svc.get_job(user_id=current_user.id, job_id=job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobOut(**dto.__dict__)

@router.post("/extension", response_model=JobOut)
def create_job_from_extension(
    payload: ManualJobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    dto = svc.create_manual_job(user_id=current_user.id, payload=payload.dict())
    return JobOut(**dto.__dict__)

@router.post("/manual", response_model=JobOut)
def create_manual_job(
    payload: ManualJobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    dto = svc.create_manual_job(user_id=current_user.id, payload=payload.dict())
    return JobOut(**dto.__dict__)

@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: uuid.UUID,
    payload: ManualJobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    try:
        dto = svc.update_job(user_id=current_user.id, job_id=job_id, payload=payload.dict())
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    return JobOut(**dto.__dict__)

@router.delete("/{job_id}")
def delete_job(
    job_id: uuid.UUID,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    try:
        svc.delete_job(user_id=current_user.id, job_id=job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    return {"message": "Job deleted successfully"}
