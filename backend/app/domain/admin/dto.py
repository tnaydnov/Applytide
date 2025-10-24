"""
Admin Data Transfer Objects (DTOs) for API responses.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ============================================================================
# Dashboard DTOs
# ============================================================================

class DashboardStatsDTO(BaseModel):
    """Quick stats for admin dashboard."""
    total_users: int
    premium_users: int
    new_users_today: int
    new_users_this_week: int
    total_applications: int
    active_users: int
    recent_errors_count: int
    
    model_config = ConfigDict(from_attributes=True)


class ActivityEventDTO(BaseModel):
    """Single activity event for activity feed."""
    id: uuid.UUID
    timestamp: datetime
    user_email: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    event_type: str  # "user_registered", "application_created", "error", etc.
    message: str
    level: str  # INFO, WARNING, ERROR, CRITICAL
    
    model_config = ConfigDict(from_attributes=True)


class ChartDataPointDTO(BaseModel):
    """Single data point for charts."""
    date: str  # ISO date string
    count: int


class DashboardChartsDTO(BaseModel):
    """Chart data for dashboard."""
    signups_last_7_days: List[ChartDataPointDTO]
    applications_last_7_days: List[ChartDataPointDTO]
    errors_last_7_days: List[ChartDataPointDTO]
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# User Management DTOs
# ============================================================================

class UserListItemDTO(BaseModel):
    """User item in list view."""
    id: uuid.UUID
    email: str
    role: str
    is_premium: bool
    premium_expires_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    is_oauth_user: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    
    # Computed fields
    active_sessions_count: int = 0
    total_applications: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserDetailDTO(BaseModel):
    """Detailed user information."""
    id: uuid.UUID
    email: str
    role: str
    is_premium: bool
    premium_expires_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    is_oauth_user: bool
    google_id: Optional[str] = None
    
    # Profile
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    
    # Timestamps
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Stats
    active_sessions_count: int = 0
    total_applications: int = 0
    total_jobs: int = 0
    total_reminders: int = 0
    total_documents: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserApplicationDTO(BaseModel):
    """User's application summary."""
    id: uuid.UUID
    job_title: str
    company_name: str
    current_stage: str
    applied_date: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserJobDTO(BaseModel):
    """User's saved job summary."""
    id: uuid.UUID
    title: str
    company: str
    location: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedUsersDTO(BaseModel):
    """Paginated users response."""
    items: List[UserListItemDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Error Monitoring DTOs
# ============================================================================

class ErrorLogDTO(BaseModel):
    """Error log item."""
    id: uuid.UUID
    timestamp: datetime
    level: str
    message: str
    user_id: Optional[uuid.UUID] = None
    user_email: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ErrorSummaryDTO(BaseModel):
    """Error summary statistics."""
    total_errors: int
    critical_count: int
    error_count: int
    warning_count: int
    errors_today: int
    errors_this_week: int
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedErrorsDTO(BaseModel):
    """Paginated errors response."""
    items: List[ErrorLogDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Session Management DTOs
# ============================================================================

class SessionDTO(BaseModel):
    """Active session information."""
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    created_at: datetime
    expires_at: datetime
    last_used_at: Optional[datetime] = None
    device_info: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionStatsDTO(BaseModel):
    """Session statistics."""
    total_active: int
    expiring_soon: int  # Within 24 hours
    expired_uncleaned: int
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedSessionsDTO(BaseModel):
    """Paginated sessions response."""
    items: List[SessionDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# System Health DTOs
# ============================================================================

class DatabaseHealthDTO(BaseModel):
    """Database health metrics."""
    total_size_mb: float
    table_count: int
    connection_pool_size: int
    active_connections: int
    
    # Table sizes
    users_count: int
    applications_count: int
    jobs_count: int
    logs_count: int
    sessions_count: int
    
    model_config = ConfigDict(from_attributes=True)


class StorageUsageDTO(BaseModel):
    """Storage usage breakdown."""
    total_documents: int
    total_size_mb: float
    documents_by_user: int
    avatars_count: int
    
    model_config = ConfigDict(from_attributes=True)


class APIHealthDTO(BaseModel):
    """API health metrics."""
    status: str  # "healthy", "degraded", "down"
    uptime_seconds: float
    requests_last_hour: int
    errors_last_hour: int
    avg_response_time_ms: float
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# LLM Usage DTOs
# ============================================================================

class LLMUsageDTO(BaseModel):
    """Single LLM usage record."""
    id: uuid.UUID
    timestamp: datetime
    user_id: uuid.UUID | None
    user_email: str | None
    provider: str
    model: str
    endpoint: str
    usage_type: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    response_time_ms: int
    success: bool
    error_message: str | None
    
    model_config = ConfigDict(from_attributes=True)


class LLMUsageStatsDTO(BaseModel):
    """LLM usage statistics."""
    total_calls: int
    successful_calls: int
    failed_calls: int
    total_cost: float
    total_tokens: int
    avg_response_time_ms: int
    by_endpoint: list[dict]  # [{"endpoint": str, "calls": int, "cost": float, "tokens": int}]
    by_model: list[dict]  # [{"model": str, "calls": int, "cost": float}]
    by_usage_type: list[dict]  # [{"usage_type": str, "calls": int, "cost": float, "tokens": int}]
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedLLMUsageDTO(BaseModel):
    """Paginated LLM usage records."""
    items: list[LLMUsageDTO]
    total: int
    page: int
    page_size: int
    pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Security Monitoring DTOs
# ============================================================================

class SecurityStatsDTO(BaseModel):
    """Security statistics for monitoring dashboard."""
    failed_logins: int
    unique_failed_ips: int
    rate_limit_violations: int
    unique_rate_limit_ips: int
    token_revocations: int
    
    model_config = ConfigDict(from_attributes=True)
