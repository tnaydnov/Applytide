# backend/app/api/routers/admin/dashboard.py
"""Dashboard and system health endpoints"""
from fastapi import APIRouter, Depends, Query, Request
from datetime import datetime

from ._deps import limiter, get_admin_service, get_client_info
from ._schemas import (
    DashboardStatsResponse,
    SystemHealthResponse,
    AnalyticsResponse,
    VerifyPasswordRequest,
    VerifyPasswordResponse,
)
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db import models
from ....domain.admin.service import AdminService
from ....infra.security.passwords import verify_password
from ....infra.cache.service import CacheService, get_cache_service
from fastapi import HTTPException, status


router = APIRouter(tags=["admin-dashboard"])


@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
@limiter.limit("100/minute")  # Rate limit: 100 requests per minute
async def get_dashboard_stats(
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get overview statistics for admin dashboard"""
    ip_address, user_agent = get_client_info(request)
    service.log_action(
        admin_id=current_admin.id,
        action="view_dashboard",
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    stats = service.get_dashboard_stats()
    return DashboardStatsResponse(
        total_users=stats.total_users,
        active_users_7d=stats.active_users_7d,
        active_users_30d=stats.active_users_30d,
        new_users_7d=stats.new_users_7d,
        premium_users=stats.premium_users,
        oauth_users=stats.oauth_users,
        total_applications=stats.total_applications,
        applications_7d=stats.applications_7d,
        applications_30d=stats.applications_30d,
        total_documents=stats.total_documents,
        documents_analyzed=stats.documents_analyzed,
        analysis_cache_hit_rate=stats.analysis_cache_hit_rate,
        total_jobs=stats.total_jobs,
        jobs_7d=stats.jobs_7d,
        total_reminders=stats.total_reminders,
        reminders_7d=stats.reminders_7d,
        avg_api_response_time=stats.avg_api_response_time,
        error_rate_24h=stats.error_rate_24h
    )


@router.post("/verify-password")
@limiter.limit("10/minute")  # Limit password verification attempts
async def verify_password_for_step_up(
    request: Request,
    body: VerifyPasswordRequest,
    current_user: models.User = Depends(get_admin_user),
    cache: CacheService = Depends(get_cache_service)
) -> VerifyPasswordResponse:
    """
    Verify admin's password for step-up authentication.
    
    This endpoint must be called before performing sensitive operations
    like changing admin status. The verification is cached for 5 minutes.
    
    After calling this endpoint, sensitive endpoints will accept requests
    for the next 5 minutes without requiring re-verification.
    """
    # Verify password
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    # Store step-up verification in cache (5 minutes)
    cache_key = f"step_up:{current_user.id}"
    await cache.set(
        cache_key,
        datetime.utcnow().isoformat(),
        expire=300  # 5 minutes
    )
    
    return VerifyPasswordResponse(
        success=True,
        message="Password verified. You can now perform sensitive operations.",
        expires_in_minutes=5
    )


@router.get("/system/health", response_model=SystemHealthResponse)
@limiter.limit("100/minute")
async def get_system_health(
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get system health metrics"""
    ip_address, user_agent = get_client_info(request)
    service.log_action(
        admin_id=current_admin.id,
        action="view_system_health",
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    health = service.get_system_health()
    return SystemHealthResponse(
        llm_calls_24h=health.llm_calls_24h,
        llm_calls_7d=health.llm_calls_7d,
        llm_cost_24h=health.llm_cost_24h,
        llm_cost_7d=health.llm_cost_7d,
        llm_cost_30d=health.llm_cost_30d,
        cache_hits_24h=health.cache_hits_24h,
        cache_misses_24h=health.cache_misses_24h,
        cache_hit_rate=health.cache_hit_rate,
        cache_size_mb=health.cache_size_mb,
        db_size_mb=health.db_size_mb,
        db_connection_pool_size=health.db_connection_pool_size,
        db_connection_pool_available=health.db_connection_pool_available,
        total_api_calls_24h=health.total_api_calls_24h,
        avg_response_time_ms=health.avg_response_time_ms,
        error_count_24h=health.error_count_24h,
        error_rate=health.error_rate,
        recent_errors=health.recent_errors or []
    )


@router.get("/analytics", response_model=AnalyticsResponse)
@limiter.limit("100/minute")
async def get_analytics(
    request: Request,
    days: int = Query(30, ge=1, le=90),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get analytics data"""
    ip_address, user_agent = get_client_info(request)
    service.log_action(
        admin_id=current_admin.id,
        action="view_analytics",
        details={"days": days},
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    analytics = service.get_analytics(days)
    return AnalyticsResponse(
        feature_usage=analytics.feature_usage,
        daily_active_users=analytics.daily_active_users,
        weekly_active_users=analytics.weekly_active_users,
        application_statuses=analytics.application_statuses,
        analysis_by_day=analytics.analysis_by_day,
        top_users=analytics.top_users
    )
