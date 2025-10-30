"""
Jobs Listing Module

Handles job listing with filtering, sorting, and pagination.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query, HTTPException

from ....db import models
from ...deps import get_current_user
from ...deps import get_job_service
from ....domain.jobs.service import JobService
from ...utils.pagination import PaginatedResponse, PaginationParams
from .schemas import JobOut
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _paginate(total: int, page: int, page_size: int):
    """Helper function to calculate pagination metadata."""
    pages = (total + page_size - 1) // page_size if page_size else 1
    return pages, page < pages, page > 1


@router.get("/", response_model=PaginatedResponse[JobOut])
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
    """
    List all saved jobs with filtering, search, and pagination.
    
    Retrieves paginated list of saved job postings with comprehensive filtering
    and sorting options. Supports full-text search across title and description.
    
    Query Parameters:
        - page: Page number (default: 1, minimum: 1)
        - page_size: Items per page (default: 20, range: 1-100)
        - q: Search query for title/description (optional)
        - location: Filter by location (partial match)
        - remote_type: Filter by remote work type
        - company: Filter by company name (partial match)
        - sort: Sort field (created_at/title/company_name)
        - order: Sort order (asc/desc, default: desc)
    
    Args:
        page: Current page number
        page_size: Number of items per page
        q: Search query string
        location: Location filter
        remote_type: Remote type filter
        company: Company name filter
        sort: Sort field name
        order: Sort direction
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        PaginatedResponse[JobOut]: Paginated job list containing:
            - items: List of JobOut objects
            - total: Total number of matching jobs
            - page: Current page number
            - page_size: Items per page
            - pages: Total number of pages
            - has_next: Boolean indicating if next page exists
            - has_prev: Boolean indicating if previous page exists
    
    Raises:
        HTTPException: 400 if pagination parameters invalid
        HTTPException: 500 if retrieval fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only list their own saved jobs
        - Query automatically scoped to user_id
    
    Notes:
        - Maximum page_size capped at 100 for performance
        - Empty search returns all jobs (respecting filters)
        - Filters combined with AND logic
        - Search performs case-insensitive partial match
        - Default sort by created_at descending (newest first)
        - Location and company filters support partial matching
        - Useful for job tracking and application management
    
    Example:
        GET /api/jobs?q=python&location=remote&page=1&page_size=20&sort=created_at&order=desc
        Response: PaginatedResponse with job listings
    """
    try:
        params = PaginationParams(page=page, page_size=page_size, q=q, sort=sort, order=order)
        filters = {"location": location, "remote_type": remote_type, "company": company}

        logger.debug(
            "Listing jobs",
            extra={
                "user_id": str(current_user.id),
                "page": page,
                "page_size": page_size,
                "has_search": bool(q)
            }
        )

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
    
    except Exception as e:
        logger.error(
            "Error listing jobs",
            extra={
                "user_id": str(current_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve jobs")
