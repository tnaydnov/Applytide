"""
Admin LLM Usage Tracking Endpoints

Provides comprehensive monitoring and cost analysis for LLM API usage.
This module contains endpoints for:
- Usage statistics (calls, costs, tokens, response times)
- Detailed usage records with filtering and pagination
- Cost tracking and optimization insights

All endpoints require admin authentication via get_admin_user dependency.

Usage data includes:
- OpenAI/Anthropic API calls
- Token consumption (input/output)
- Cost calculation per call
- Response times and success rates
- Breakdown by endpoint and usage type
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto
from app.infra.logging import get_logger

# Router configuration
router = APIRouter(prefix="/llm-usage", tags=["admin-llm-usage"])
logger = get_logger(__name__)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """
    Dependency injection for AdminService.
    
    Args:
        db: Database session from FastAPI dependency
        
    Returns:
        AdminService: Initialized service instance with database access
    """
    return AdminService(db)


@router.get("/stats", response_model=dto.LLMUsageStatsDTO)
def get_llm_usage_stats(
    hours: Optional[int] = 24,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve aggregated LLM usage statistics for cost monitoring.
    
    Provides comprehensive statistics about LLM API usage including:
    - Total API calls (successful and failed)
    - Total cost across all calls (in USD)
    - Total tokens consumed (input and output)
    - Average response time per call
    - Breakdown by endpoint (job_extraction, cover_letter, etc.)
    - Breakdown by model (gpt-4, gpt-3.5-turbo, etc.)
    
    Query Parameters:
        hours (int): Time window in hours (default: 24, null for all-time)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: Admin service instance (from dependency)
        
    Returns:
        LLMUsageStatsDTO: Statistics object containing:
            - total_calls: Total number of API calls
            - success_count: Number of successful calls
            - failure_count: Number of failed calls
            - total_cost: Total cost in USD
            - total_tokens: Total tokens consumed
            - avg_response_time_ms: Average response time
            - by_endpoint: Usage breakdown by endpoint
            - by_model: Usage breakdown by model
            
    Raises:
        HTTPException: 500 if statistics cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Cost tracking helps identify expensive operations
        - Useful for budget monitoring and optimization
        - null hours parameter returns all-time statistics
    """
    try:
        # Log the request
        logger.debug(
            "Admin fetching LLM usage stats",
            extra={"admin_id": str(admin_user.id), "hours": hours}
        )
        
        # Fetch statistics from service
        stats = service.get_llm_usage_stats(hours=hours)
        
        # Log successful retrieval with key metrics
        logger.info(
            "LLM usage stats retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_calls": stats.total_calls,
                "total_cost": float(stats.total_cost) if stats.total_cost else 0
            }
        )
        
        return stats
        
    except Exception as e:
        # Log error with context
        logger.error(
            "Error fetching LLM usage stats",
            extra={"admin_id": str(admin_user.id), "hours": hours, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch LLM usage statistics"
        )


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
    List individual LLM usage records with advanced filtering.
    
    Returns detailed records of each LLM API call with full context.
    Useful for auditing, debugging, and identifying cost outliers.
    
    Query Parameters:
        page (int): Page number, starting from 1 (default: 1)
        page_size (int): Items per page, range 1-100 (default: 50)
        endpoint (str): Filter by endpoint name
            Examples: "job_extraction", "cover_letter_generation", "resume_optimization"
        usage_type (str): Filter by usage context
            Examples: "chrome_extension", "cover_letter", "resume_general", "resume_job"
        user_id (int): Filter by specific user ID
        success_only (bool): Show only successful calls (true/false/null for all)
        hours (int): Only show records from last N hours
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: Admin service instance (from dependency)
        
    Returns:
        PaginatedLLMUsageDTO: Paginated list with:
            - items: List of usage records with tokens, cost, duration
            - total: Total count of matching records
            - page: Current page number
            - page_size: Items per page
            - total_pages: Total pages available
            
    Raises:
        HTTPException: 500 if usage records cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Each record includes full request/response details
        - Cost is calculated per-call based on token usage
        - Useful for identifying expensive or failing operations
        - Page size capped at 100 for performance
        
    Example:
        GET /api/admin/llm-usage?endpoint=job_extraction&success_only=false&hours=24
        Returns failed job extractions from the last 24 hours
    """
    try:
        # Log the request with all filters
        logger.debug(
            "Admin listing LLM usage",
            extra={
                "admin_id": str(admin_user.id),
                "page": page,
                "page_size": page_size,
                "filters": {
                    "endpoint": endpoint,
                    "usage_type": usage_type,
                    "user_id": user_id,
                    "success_only": success_only,
                    "hours": hours
                }
            }
        )
        
        # Fetch paginated usage records from service
        result = service.get_llm_usage_list(
            page=page,
            page_size=page_size,
            endpoint=endpoint,
            usage_type=usage_type,
            user_id=user_id,
            success_only=success_only,
            hours=hours
        )
        
        # Log successful retrieval with metrics
        logger.info(
            "LLM usage list retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_records": result.total,
                "returned_count": len(result.items)
            }
        )
        
        return result
        
    except Exception as e:
        # Log error with context
        logger.error(
            "Error listing LLM usage",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to list LLM usage records"
        )
