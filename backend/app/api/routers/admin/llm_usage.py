"""
Admin LLM usage tracking endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto

router = APIRouter(prefix="/llm-usage", tags=["admin-llm-usage"])


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get admin service instance."""
    return AdminService(db)


@router.get("/stats", response_model=dto.LLMUsageStatsDTO)
def get_llm_usage_stats(
    hours: Optional[int] = 24,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get LLM usage statistics.
    
    Query params:
    - hours: Time window in hours (default: 24, null for all time)
    
    Returns statistics including:
    - Total API calls, success/failure counts
    - Total cost and tokens used
    - Average response time
    - Breakdown by endpoint and model
    """
    return service.get_llm_usage_stats(hours=hours)


@router.get("", response_model=dto.PaginatedLLMUsageDTO)
def list_llm_usage(
    page: int = 1,
    page_size: int = 50,
    endpoint: Optional[str] = None,
    usage_type: Optional[str] = None,
    user_id: Optional[int] = None,
    success_only: Optional[bool] = None,
    hours: Optional[int] = None,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    List LLM usage records with pagination and filters.
    
    Query params:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50, max: 100)
    - endpoint: Filter by endpoint (e.g., "job_extraction", "cover_letter_generation")
    - usage_type: Filter by usage type (e.g., "chrome_extension", "cover_letter", "resume_general", "resume_job")
    - user_id: Filter by user ID
    - success_only: Filter by success status (true/false/null for all)
    - hours: Only show records from last N hours
    """
    return service.get_llm_usage_list(
        page=page,
        page_size=page_size,
        endpoint=endpoint,
        usage_type=usage_type,
        user_id=user_id,
        success_only=success_only,
        hours=hours
    )
