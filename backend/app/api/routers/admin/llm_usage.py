"""
LLM Usage Monitoring - Admin endpoints for viewing LLM API usage and costs
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user
from ....db.session import get_db
from ....db import models
from ....domain.admin.llm_usage_service import LLMUsageService
from ....infra.logging import get_logger


router = APIRouter(tags=["admin-llm-usage"])
logger = get_logger(__name__)


@router.get("/llm-usage/stats")
@limiter.limit("100/minute")
async def get_llm_usage_stats(
    request: Request,
    hours: int = Query(24, ge=1, le=720, description="Time period in hours (1-720)"),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get overall LLM usage statistics for a time period.
    
    Returns:
    - Total API calls
    - Total tokens used
    - Total cost (in cents and dollars)
    - Average latency
    - Breakdown by provider (OpenAI, etc.)
    - Breakdown by model (gpt-4, gpt-3.5-turbo, etc.)
    - Breakdown by purpose (cover_letter, document_analysis, etc.)
    - Error rate
    
    **Time Periods**:
    - 24 hours (1 day)
    - 168 hours (7 days)
    - 720 hours (30 days)
    """
    logger.info(
        "Admin requesting LLM usage stats",
        extra={"admin_id": str(current_admin.id), "hours": hours}
    )
    
    service = LLMUsageService(db)
    stats = service.get_llm_stats(hours=hours)
    
    logger.info(
        "LLM usage stats retrieved",
        extra={
            "admin_id": str(current_admin.id),
            "total_calls": stats['total_calls'],
            "total_cost_dollars": stats['total_cost_dollars']
        }
    )
    
    return stats


@router.get("/llm-usage/by-user")
@limiter.limit("60/minute")
async def get_llm_usage_by_user(
    request: Request,
    limit: int = Query(50, ge=1, le=200, description="Maximum users to return"),
    hours: Optional[int] = Query(None, ge=1, le=720, description="Optional time filter"),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get LLM usage breakdown by user (top users by cost).
    
    Shows which users are consuming the most LLM resources.
    Useful for:
    - Identifying power users
    - Detecting abuse
    - Usage-based billing analysis
    
    Returns users sorted by total cost (highest first).
    """
    logger.info(
        "Admin requesting LLM usage by user",
        extra={
            "admin_id": str(current_admin.id),
            "limit": limit,
            "hours": hours
        }
    )
    
    service = LLMUsageService(db)
    usage_by_user = service.get_usage_by_user(limit=limit, hours=hours)
    
    return {
        "time_period_hours": hours,
        "users": usage_by_user
    }


@router.get("/llm-usage/by-model")
@limiter.limit("60/minute")
async def get_llm_usage_by_model(
    request: Request,
    hours: int = Query(168, ge=1, le=720, description="Time period in hours"),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get LLM usage breakdown by model.
    
    Shows which models are being used most frequently and their costs.
    Useful for:
    - Understanding model usage patterns
    - Cost optimization (e.g., switching from GPT-4 to GPT-3.5 where appropriate)
    - Capacity planning
    
    Returns models sorted by total cost (highest first).
    """
    logger.info(
        "Admin requesting LLM usage by model",
        extra={"admin_id": str(current_admin.id), "hours": hours}
    )
    
    service = LLMUsageService(db)
    usage_by_model = service.get_usage_by_model(hours=hours)
    
    return {
        "time_period_hours": hours,
        "models": usage_by_model
    }


@router.get("/llm-usage/recent")
@limiter.limit("60/minute")
async def get_recent_llm_calls(
    request: Request,
    limit: int = Query(100, ge=1, le=500, description="Maximum calls to return"),
    include_errors: bool = Query(True, description="Include failed calls"),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get recent LLM API calls.
    
    Shows individual API calls with details:
    - User who made the call
    - Model used
    - Tokens consumed
    - Cost
    - Latency
    - Errors (if any)
    
    Useful for:
    - Debugging LLM issues
    - Monitoring real-time usage
    - Auditing specific calls
    """
    logger.info(
        "Admin requesting recent LLM calls",
        extra={
            "admin_id": str(current_admin.id),
            "limit": limit,
            "include_errors": include_errors
        }
    )
    
    service = LLMUsageService(db)
    recent_calls = service.get_recent_calls(limit=limit, include_errors=include_errors)
    
    return {
        "calls": recent_calls,
        "count": len(recent_calls)
    }


@router.get("/llm-usage/costs")
@limiter.limit("60/minute")
async def get_llm_cost_breakdown(
    request: Request,
    hours: int = Query(24, ge=1, le=720, description="Time period in hours"),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed cost breakdown for LLM usage.
    
    Provides cost analysis across multiple dimensions:
    - By provider (OpenAI, etc.)
    - By model (gpt-4, gpt-3.5-turbo, etc.)
    - By purpose (cover_letter, document_analysis, etc.)
    
    Each breakdown includes:
    - Total cost
    - Number of calls
    - Average cost per call
    - Percentage of total cost
    
    Useful for:
    - Budget tracking
    - Cost optimization
    - Understanding where money is being spent
    """
    logger.info(
        "Admin requesting LLM cost breakdown",
        extra={"admin_id": str(current_admin.id), "hours": hours}
    )
    
    service = LLMUsageService(db)
    cost_breakdown = service.get_cost_breakdown(hours=hours)
    
    return cost_breakdown


@router.get("/llm-usage/trends")
@limiter.limit("60/minute")
async def get_llm_usage_trends(
    request: Request,
    days: int = Query(7, ge=1, le=90, description="Number of days to analyze"),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get daily LLM usage trends over time.
    
    Shows how LLM usage is trending:
    - Daily API calls
    - Daily token consumption
    - Daily costs
    
    Useful for:
    - Identifying usage patterns
    - Spotting anomalies
    - Forecasting costs
    - Capacity planning
    
    Returns data sorted chronologically (oldest to newest).
    """
    logger.info(
        "Admin requesting LLM usage trends",
        extra={"admin_id": str(current_admin.id), "days": days}
    )
    
    service = LLMUsageService(db)
    trends = service.get_usage_trends(days=days)
    
    return {
        "days": days,
        "data": trends,
        "data_points": len(trends)
    }
