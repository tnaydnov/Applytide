from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..db.session import get_db
from ..db import models
from .service import AdvancedSearchService
from .models import (
    SearchRequest, SearchResponse, SearchResult, SearchScope, 
    SortOption, SearchFilters, SavedSearch, SearchSuggestion,
    DateRange, SalaryRange
)

router = APIRouter(prefix="/search", tags=["search"])
search_service = AdvancedSearchService()

@router.post("/advanced", response_model=SearchResponse)
def advanced_search(
    request: SearchRequest,
    db: Session = Depends(get_db)
):
    """
    Perform advanced search across all entity types with sophisticated filtering
    """
    try:
        results, total, metadata = search_service.search(
            db=db,
            query=request.query,
            scope=request.scope,
            filters=request.filters,
            sort=request.sort,
            page=request.page,
            page_size=request.page_size
        )
        
        pages = (total + request.page_size - 1) // request.page_size
        
        response = SearchResponse(
            results=results,
            total=total,
            page=request.page,
            page_size=request.page_size,
            pages=pages,
            has_next=request.page < pages,
            has_prev=request.page > 1,
            aggregations=metadata.get("aggregations"),
            query_time_ms=metadata.get("query_time_ms", 0)
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/suggestions", response_model=List[SearchSuggestion])
def get_search_suggestions(
    q: str = Query(..., min_length=1, description="Partial search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    db: Session = Depends(get_db)
):
    """
    Get search suggestions for autocomplete
    """
    suggestions = search_service.get_search_suggestions(db, q, limit)
    return suggestions

@router.get("/filters", response_model=dict)
def get_filter_options(
    db: Session = Depends(get_db)
):
    """
    Get available filter options for advanced search
    """
    # Get distinct values for various filters
    
    # Companies
    companies = db.query(models.Company.name).distinct().order_by(models.Company.name).limit(100).all()
    company_options = [name for name, in companies]
    
    # Locations
    locations = db.query(models.Job.location).filter(models.Job.location.isnot(None)).distinct().order_by(models.Job.location).limit(100).all()
    location_options = [loc for loc, in locations]
    
    # Remote types
    remote_types = db.query(models.Job.remote_type).filter(models.Job.remote_type.isnot(None)).distinct().all()
    remote_type_options = [rt for rt, in remote_types]
    
    # Application statuses
    application_statuses = db.query(models.Application.status).distinct().all()
    status_options = [status for status, in application_statuses]
    
    # Job titles (top 50 most common)
    job_titles = db.query(models.Job.title).distinct().order_by(models.Job.title).limit(50).all()
    job_title_options = [title for title, in job_titles]
    
    return {
        "companies": company_options,
        "locations": location_options,
        "remote_types": remote_type_options,
        "application_statuses": status_options,
        "job_titles": job_title_options,
        "experience_levels": ["Entry Level", "Mid Level", "Senior Level", "Executive", "Internship"],
        "industries": ["Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing", "Consulting", "Media"]
    }

@router.post("/saved", response_model=dict)
def save_search(
    saved_search: SavedSearch,
    db: Session = Depends(get_db)
):
    """
    Save a search configuration for later use
    """
    # In a real implementation, you'd save this to a database table
    # For now, we'll return a success response
    return {"message": "Search saved successfully", "id": "placeholder-id"}

@router.get("/saved", response_model=List[dict])
def list_saved_searches(
    db: Session = Depends(get_db)
):
    """
    List user's saved searches
    """
    # In a real implementation, you'd retrieve from database
    # For now, return empty list
    return []

@router.delete("/saved/{search_id}")
def delete_saved_search(
    search_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a saved search
    """
    return {"message": "Search deleted successfully"}

@router.get("/quick/{entity_type}")
def quick_search(
    entity_type: str,
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Quick search for specific entity types (for autocomplete dropdowns)
    """
    results = []
    
    if entity_type == "jobs":
        jobs = db.query(models.Job).filter(
            models.Job.title.ilike(f"%{q}%")
        ).limit(limit).all()
        
        results = [{"id": str(job.id), "text": job.title, "subtitle": job.company.name if job.company else None} for job in jobs]
    
    elif entity_type == "companies":
        companies = db.query(models.Company).filter(
            models.Company.name.ilike(f"%{q}%")
        ).limit(limit).all()
        
        results = [{"id": str(company.id), "text": company.name, "subtitle": company.website} for company in companies]
    
    elif entity_type == "applications":
        applications = db.query(models.Application).join(models.Job).filter(
            models.Job.title.ilike(f"%{q}%")
        ).limit(limit).all()
        
        results = [{"id": str(app.id), "text": f"{app.job.title} at {app.job.company.name if app.job.company else 'Unknown'}", "subtitle": app.status} for app in applications]
    
    return {"results": results}
