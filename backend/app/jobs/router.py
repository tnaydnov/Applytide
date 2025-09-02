from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from ..db.session import get_db
from ..db import models
from ..auth.deps import get_current_user
from .schemas import JobCreate, JobOut, ScrapeIn, JobSearchOut
from .scraper import scrape_job
from ..core.pagination import PaginationParams, PaginatedResponse, paginate_query, apply_search_filter, apply_sorting
from ..core.search import search_service

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("", response_model=JobOut)
def create_job(
    payload: JobCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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
        user_id=current_user.id,  # Associate job with current user
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


@router.get("", response_model=PaginatedResponse[JobOut])
def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    q: str = Query("", description="Search query for title and description"),
    location: str = Query("", description="Filter by location"),
    remote_type: str = Query("", description="Filter by remote type"),
    company: str = Query("", description="Filter by company name"),
    sort: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List jobs with pagination, search, and filtering capabilities.
    Supports full-text search on title and description.
    """
    params = PaginationParams(
        page=page,
        page_size=page_size,
        q=q,
        sort=sort,
        order=order
    )
    
    # If there's a search query, use full-text search
    if q.strip():
        filters = {"user_id": str(current_user.id)}  # Filter by current user
        if location:
            filters["location"] = location
        if remote_type:
            filters["remote_type"] = remote_type
        if company:
            filters["company"] = company
        
        # Use full-text search service
        offset = (page - 1) * page_size
        jobs_data = search_service.search_jobs(
            db=db,
            query_text=q,
            limit=page_size,
            offset=offset,
            filters=filters
        )
        
        total = search_service.count_search_results(db, q, filters)
        
        # Convert to JobOut format
        items = []
        for job_data in jobs_data:
            job_item = JobOut(
                id=uuid.UUID(job_data["id"]),
                title=job_data["title"],
                description=job_data["description"],
                location=job_data["location"],
                remote_type=job_data["remote_type"],
                salary_min=job_data["salary_min"],
                salary_max=job_data["salary_max"],
                source_url=job_data["source_url"],
                created_at=job_data["created_at"],
                company_id=None,  # Would need to include in search if needed
                company_name=job_data["company_name"],
                website=job_data["company_website"]
            )
            items.append(job_item)
        
        # Calculate pagination metadata
        pages = (total + page_size - 1) // page_size
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1
        )
    
    # Regular query with filters
    query = select(models.Job).join(
        models.Company, models.Job.company_id == models.Company.id, isouter=True
    ).filter(
        models.Job.user_id == current_user.id
    )  # Show only current user's jobs
    
    # Apply filters
    if location:
        query = query.filter(models.Job.location.ilike(f"%{location}%"))
    if remote_type:
        query = query.filter(models.Job.remote_type == remote_type)
    if company:
        query = query.filter(models.Company.name.ilike(f"%{company}%"))
    
    # Apply sorting
    query = apply_sorting(query, models.Job, params.sort, params.order)
    
    # Get total count
    total_query = select(func.count(models.Job.id)).filter(models.Job.user_id == current_user.id)
    if location:
        total_query = total_query.filter(models.Job.location.ilike(f"%{location}%"))
    if remote_type:
        total_query = total_query.filter(models.Job.remote_type == remote_type)
    if company:
        total_query = total_query.join(models.Company).filter(models.Company.name.ilike(f"%{company}%"))
    
    # Execute queries manually to handle the join properly
    offset = (params.page - 1) * params.page_size
    jobs_query = query.offset(offset).limit(params.page_size)
    
    # Execute the queries
    jobs_with_company = db.execute(
        select(models.Job, models.Company.name.label('company_name'))
        .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
        .filter(models.Job.user_id == current_user.id)
        .offset(offset).limit(params.page_size)
    ).all()
    
    total = db.execute(total_query).scalar() or 0
    
    # Convert to JobOut format
    items = []
    for job, company_name in jobs_with_company:
        job_out = JobOut(
            id=job.id,
            title=job.title,
            company_id=job.company_id,
            company_name=company_name,
            website=None,  # Would need to join if we want this
            location=job.location,
            remote_type=job.remote_type,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            description=job.description,
            source_url=job.source_url,
            created_at=job.created_at
        )
        items.append(job_out)
    
    # Calculate pagination metadata
    pages = (total + params.page_size - 1) // params.page_size
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
        pages=pages,
        has_next=params.page < pages,
        has_prev=params.page > 1
    )


@router.get("/search", response_model=PaginatedResponse[JobSearchOut])
def search_jobs(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    location: str = Query("", description="Filter by location"),
    remote_type: str = Query("", description="Filter by remote type"),
    company: str = Query("", description="Filter by company"),
    salary_min: int = Query(None, description="Minimum salary filter"),
    db: Session = Depends(get_db)
):
    """
    Advanced full-text search for jobs with relevance scoring.
    Returns results ranked by relevance to the search query.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query is required")
    
    filters = {}
    if location:
        filters["location"] = location
    if remote_type:
        filters["remote_type"] = remote_type
    if company:
        filters["company"] = company
    if salary_min:
        filters["salary_min"] = salary_min
    
    offset = (page - 1) * page_size
    jobs_data = search_service.search_jobs(
        db=db,
        query_text=q,
        limit=page_size,
        offset=offset,
        filters=filters
    )
    
    total = search_service.count_search_results(db, q, filters)
    
    # Convert to JobSearchOut format (includes relevance score)
    items = [JobSearchOut(**job_data) for job_data in jobs_data]
    
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1
    )


@router.get("/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    db: Session = Depends(get_db)
):
    """Get search term suggestions based on partial input"""
    suggestions = search_service.suggest_search_terms(db, q)
    return {"suggestions": suggestions}


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
    try:
        data = scrape_job(str(payload.url))
        return JobCreate(**data)
    except Exception as e:
        # Provide helpful error messages for common issues
        error_msg = str(e)
        url_str = str(payload.url).lower()
        if "linkedin.com" in url_str:
            error_msg = "LinkedIn URLs are not supported due to anti-bot protection. Try using the company's direct career page instead."
        elif "403" in error_msg or "forbidden" in error_msg.lower():
            error_msg = "Access forbidden. This site blocks automated requests. Try a different URL."
        elif "timeout" in error_msg.lower():
            error_msg = "Request timed out. The site may be slow or blocking requests."
        elif "404" in error_msg or "not found" in error_msg.lower():
            error_msg = "Page not found. Please check if the URL is correct."
        else:
            error_msg = f"Failed to scrape URL: {error_msg}"
        
        raise HTTPException(status_code=400, detail=error_msg)
