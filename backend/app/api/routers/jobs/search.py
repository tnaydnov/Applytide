"""
Jobs Search Module

Handles advanced job search with relevance scoring and suggestions.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query

from ....db import models
from ...deps import get_current_user
from ...deps import get_job_service
from ....domain.jobs.service import JobService
from ...utils.pagination import PaginatedResponse
from .schemas import JobSearchOut

router = APIRouter()


def _paginate(total: int, page: int, page_size: int):
    """Helper function to calculate pagination metadata."""
    pages = (total + page_size - 1) // page_size if page_size else 1
    return pages, page < pages, page > 1


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
    """
    Advanced job search with relevance scoring.
    
    Performs intelligent search across job postings with relevance ranking. Uses
    full-text search with scoring to return most relevant results first.
    
    Query Parameters:
        - q: Search query (required) - searches title, description, requirements, skills
        - page: Page number (default: 1, minimum: 1)
        - page_size: Items per page (default: 20, range: 1-100)
        - location: Filter by location (optional)
        - remote_type: Filter by remote work type (optional)
        - company: Filter by company name (optional)
    
    Args:
        q: Search query string (required)
        page: Current page number
        page_size: Number of items per page
        location: Location filter
        remote_type: Remote type filter
        company: Company name filter
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        PaginatedResponse[JobSearchOut]: Paginated search results containing:
            - items: List of JobSearchOut objects with relevance_score
            - total: Total number of matching jobs
            - page: Current page number
            - page_size: Items per page
            - pages: Total number of pages
            - has_next: Boolean indicating if next page exists
            - has_prev: Boolean indicating if previous page exists
    
    Raises:
        HTTPException: 400 if search query empty or invalid
        HTTPException: 500 if search fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only search their own saved jobs
        - Query automatically scoped to user_id
    
    Notes:
        - Search query required (use list_jobs for browsing without search)
        - Relevance scoring based on query term frequency and position
        - Results sorted by relevance_score descending (most relevant first)
        - Searches across: title, description, requirements, skills fields
        - Filters applied after search (AND logic)
        - Case-insensitive search
        - Partial word matching supported
        - Useful for finding jobs matching specific criteria
    
    Example:
        GET /api/jobs/search?q=python+fastapi&location=remote&page=1&page_size=20
        Response: PaginatedResponse with JobSearchOut objects including relevance scores
    """
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
    """
    Get search term suggestions for autocomplete.
    
    Returns search term suggestions based on user's saved jobs. Used for autocomplete
    functionality in search fields to help users quickly find relevant jobs.
    
    Query Parameters:
        - q: Partial search query (minimum 2 characters)
    
    Args:
        q: Partial search string
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        dict: Suggestions containing:
            - suggestions: List of suggested search terms (strings)
    
    Raises:
        HTTPException: 400 if query too short (< 2 characters)
        HTTPException: 500 if suggestion generation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Suggestions derived only from user's own saved jobs
        - No data leakage from other users
    
    Notes:
        - Minimum query length: 2 characters for performance
        - Suggestions based on frequently occurring terms in user's jobs
        - Includes: job titles, company names, skills, locations
        - Results sorted by frequency/relevance
        - Maximum ~10 suggestions returned
        - Case-insensitive matching
        - Useful for search field autocomplete UI
        - Fast response for real-time suggestions
    
    Example:
        GET /api/jobs/suggestions?q=py
        Response:
        {
            "suggestions": ["Python", "PyTorch", "Python Developer"]
        }
    """
    return {"suggestions": svc.suggest_terms(user_id=current_user.id, q=q)}
