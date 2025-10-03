# backend/app/api/routers/admin.py
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
import io
import csv

from ...db.session import get_db
from ...db import models
from ...domain.admin.repository import AdminRepository
from ...domain.admin.service import AdminService
from ..deps_auth import get_admin_user, get_admin_user_with_step_up
from ...infra.security.password import verify_password
from ...infra.cache.service import CacheService, get_cache_service


router = APIRouter(prefix="/admin", tags=["admin"])

# Rate limiter for admin endpoints
limiter = Limiter(key_func=get_remote_address)


# ==================== PYDANTIC SCHEMAS ====================

class UserSummaryResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_premium: bool
    is_admin: bool
    is_oauth_user: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    total_applications: int
    total_documents: int
    total_jobs: int


class UserDetailResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    is_premium: bool
    is_admin: bool
    is_oauth_user: bool
    google_id: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    timezone: Optional[str]
    website: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    email_verified_at: Optional[datetime]
    last_login_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    total_applications: int
    total_documents: int
    total_jobs: int
    total_reminders: int
    recent_activity: list


class UserListResponse(BaseModel):
    users: list[UserSummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class VerifyPasswordRequest(BaseModel):
    """Request to verify password for step-up authentication"""
    password: str = Field(..., min_length=1, description="User's current password")


class VerifyPasswordResponse(BaseModel):
    """Response after successful password verification"""
    success: bool
    message: str
    expires_in_minutes: int


class DashboardStatsResponse(BaseModel):
    total_users: int
    active_users_7d: int
    active_users_30d: int
    new_users_7d: int
    premium_users: int
    oauth_users: int
    total_applications: int
    applications_7d: int
    applications_30d: int
    total_documents: int
    documents_analyzed: int
    analysis_cache_hit_rate: float
    total_jobs: int
    jobs_7d: int
    total_reminders: int
    reminders_7d: int
    avg_api_response_time: Optional[float] = None
    error_rate_24h: Optional[float] = None


class SystemHealthResponse(BaseModel):
    llm_calls_24h: int
    llm_calls_7d: int
    llm_cost_24h: float
    llm_cost_7d: float
    llm_cost_30d: float
    cache_hits_24h: int
    cache_misses_24h: int
    cache_hit_rate: float
    cache_size_mb: float
    db_size_mb: float
    db_connection_pool_size: int
    db_connection_pool_available: int
    total_api_calls_24h: int
    avg_response_time_ms: float
    error_count_24h: int
    error_rate: float
    recent_errors: list


class AnalyticsResponse(BaseModel):
    feature_usage: dict
    daily_active_users: list
    weekly_active_users: list
    application_statuses: dict
    analysis_by_day: list
    top_users: list


class AdminLogResponse(BaseModel):
    id: str
    admin_id: Optional[str]  # Nullable - admin may have been deleted
    admin_email: str  # Always preserved for audit trail
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


class AdminLogsListResponse(BaseModel):
    logs: list[AdminLogResponse]
    total: int
    page: int
    page_size: int


class UpdateAdminStatusRequest(BaseModel):
    is_admin: bool
    reason: str = Field(..., min_length=10, max_length=500, description="Justification for changing admin status (required for audit trail)")


class UpdatePremiumStatusRequest(BaseModel):
    is_premium: bool
    expires_at: Optional[datetime] = None
    reason: str = Field(..., min_length=10, max_length=500, description="Justification for changing premium status (required for audit trail)")


# ==================== HELPER FUNCTIONS ====================

def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get admin service"""
    repo = AdminRepository(db)
    return AdminService(repo)


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent"""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


# ==================== ENDPOINTS ====================

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


# ==================== STEP-UP AUTHENTICATION ENDPOINT ====================

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


@router.get("/users", response_model=UserListResponse)
@limiter.limit("100/minute")
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_premium: Optional[bool] = Query(None),
    is_admin: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """List users with pagination and filters"""
    ip_address, user_agent = get_client_info(request)
    service.log_action(
        admin_id=current_admin.id,
        action="list_users",
        details={
            "page": page,
            "search": search,
            "filters": {"is_premium": is_premium, "is_admin": is_admin}
        },
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    users, total = service.list_users(
        page=page,
        page_size=page_size,
        search=search,
        is_premium=is_premium,
        is_admin=is_admin,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    total_pages = (total + page_size - 1) // page_size
    
    return UserListResponse(
        users=[
            UserSummaryResponse(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                is_premium=u.is_premium,
                is_admin=u.is_admin,
                is_oauth_user=u.is_oauth_user,
                last_login_at=u.last_login_at,
                created_at=u.created_at,
                total_applications=u.total_applications,
                total_documents=u.total_documents,
                total_jobs=u.total_jobs
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
@limiter.limit("100/minute")
async def get_user_detail(
    user_id: UUID,
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get detailed user information"""
    ip_address, user_agent = get_client_info(request)
    service.log_action(
        admin_id=current_admin.id,
        action="view_user_detail",
        target_type="user",
        target_id=str(user_id),
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    user = service.get_user_detail(user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserDetailResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_premium=user.is_premium,
        is_admin=user.is_admin,
        is_oauth_user=user.is_oauth_user,
        google_id=user.google_id,
        avatar_url=user.avatar_url,
        bio=user.bio,
        phone=user.phone,
        location=user.location,
        timezone=user.timezone,
        website=user.website,
        linkedin_url=user.linkedin_url,
        github_url=user.github_url,
        email_verified_at=user.email_verified_at,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_applications=user.total_applications,
        total_documents=user.total_documents,
        total_jobs=user.total_jobs,
        total_reminders=user.total_reminders,
        recent_activity=user.recent_activity or []
    )


@router.patch("/users/{user_id}/admin-status")
@limiter.limit("20/minute")  # Stricter rate limit for sensitive action
async def update_user_admin_status(
    user_id: UUID,
    payload: UpdateAdminStatusRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """
    Update user's admin status (requires justification + step-up auth).
    
    SECURITY: This endpoint requires step-up authentication.
    Admins must call POST /admin/verify-password within the last 5 minutes
    before this endpoint will accept requests.
    """
    ip_address, user_agent = get_client_info(request)
    
    success = service.update_user_admin_status(
        admin_id=current_admin.id,
        user_id=user_id,
        is_admin=payload.is_admin,
        reason=payload.reason,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "Admin status updated"}


@router.patch("/users/{user_id}/premium-status")
@limiter.limit("50/minute")  # Moderate rate limit
async def update_user_premium_status(
    user_id: UUID,
    payload: UpdatePremiumStatusRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Update user's premium status (requires justification)"""
    ip_address, user_agent = get_client_info(request)
    
    success = service.update_user_premium_status(
        admin_id=current_admin.id,
        user_id=user_id,
        is_premium=payload.is_premium,
        expires_at=payload.expires_at,
        reason=payload.reason,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "Premium status updated"}


@router.get("/logs", response_model=AdminLogsListResponse)
@limiter.limit("100/minute")
async def get_admin_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """Get admin action logs"""
    logs, total = service.get_admin_logs(
        page=page,
        page_size=page_size,
        admin_id=admin_id,
        action=action
    )
    
    return AdminLogsListResponse(
        logs=[
            AdminLogResponse(
                id=str(log.id),
                admin_id=str(log.admin_id),
                admin_email=log.admin_email,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at
            )
            for log in logs
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/logs/export")
@limiter.limit("10/minute")  # Strict limit for export operations
async def export_admin_logs_csv(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of days of logs to export"),
    admin_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Export admin logs as CSV file (last N days).
    
    Rate limited to 10 requests per minute due to resource intensity.
    Returns a downloadable CSV file with all audit logs matching the criteria.
    """
    # Get all logs matching criteria (no pagination for export)
    logs, _ = service.get_admin_logs(
        page=1,
        page_size=10000,  # Large limit for export
        admin_id=admin_id,
        action=action
    )
    
    # Filter by date
    cutoff = datetime.utcnow() - timedelta(days=days)
    filtered_logs = [log for log in logs if log.created_at >= cutoff]
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Timestamp", "Admin Email", "Admin ID", "Action", 
        "Target Type", "Target ID", "Details", "IP Address", "User Agent"
    ])
    
    # Write data
    for log in filtered_logs:
        writer.writerow([
            log.created_at.isoformat(),
            log.admin_email,
            str(log.admin_id) if log.admin_id else "N/A",
            log.action,
            log.target_type or "",
            log.target_id or "",
            str(log.details) if log.details else "",
            log.ip_address or "",
            log.user_agent or ""
        ])
    
    # Prepare response
    output.seek(0)
    filename = f"admin_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.delete("/logs/purge")
@limiter.limit("5/hour")  # Very strict - only 5 purges per hour
async def purge_old_logs(
    request: Request,
    days: int = Query(365, ge=30, le=3650, description="Delete logs older than N days (min 30, max 3650)"),
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service)
):
    """
    Purge admin logs older than specified days (GDPR compliance).
    
    WARNING: This permanently deletes audit logs. Use with caution.
    Minimum retention period is 30 days. Default is 365 days (1 year).
    Rate limited to 5 requests per hour.
    
    SECURITY: This endpoint requires step-up authentication.
    Admins must call POST /admin/verify-password within the last 5 minutes.
    
    The purge action itself is logged before deletion occurs.
    """
    ip_address, user_agent = get_client_info(request)
    
    # Log the purge action BEFORE purging
    service.log_action(
        admin_id=current_admin.id,
        action="purge_audit_logs",
        details={"days": days, "reason": "GDPR compliance / retention policy"},
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Perform purge
    cutoff = datetime.utcnow() - timedelta(days=days)
    deleted_count = service.repo.db.query(models.AdminLog).filter(
        models.AdminLog.created_at < cutoff
    ).delete()
    
    service.repo.db.commit()
    
    return {
        "success": True,
        "message": f"Purged {deleted_count} log entries older than {days} days",
        "deleted_count": deleted_count,
        "cutoff_date": cutoff.isoformat()
    }
