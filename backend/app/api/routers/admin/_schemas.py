# backend/app/api/routers/admin/_schemas.py
"""Shared Pydantic schemas for admin routers"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ==================== USER SCHEMAS ====================

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
    users: List[UserSummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UpdateAdminStatusRequest(BaseModel):
    is_admin: bool
    reason: str = Field(..., min_length=10, max_length=500, description="Justification for changing admin status (required for audit trail)")


class UpdatePremiumStatusRequest(BaseModel):
    is_premium: bool
    expires_at: Optional[datetime] = None
    reason: str = Field(..., min_length=10, max_length=500, description="Justification for changing premium status (required for audit trail)")


class BanUserRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=1000, description="Reason for banning the user")
    revoke_sessions: bool = Field(True, description="Terminate all active sessions")


class UnbanUserRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for unbanning the user")


class DeleteUserRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=1000, description="Reason for deleting the user")
    hard_delete: bool = Field(False, description="Permanently delete all user data (cannot be undone)")
    confirm_email: str = Field(..., description="User's email for confirmation")


class ResetUserPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=100, description="New password for the user")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for resetting password")
    revoke_sessions: bool = Field(True, description="Terminate all active sessions after reset")


class TerminateSessionRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500, description="Reason for terminating session")


class ActiveSessionResponse(BaseModel):
    id: str
    user_id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    device_info: Optional[str]
    location: Optional[str]
    last_activity_at: datetime
    created_at: datetime
    expires_at: datetime


class UserSessionsResponse(BaseModel):
    sessions: List[ActiveSessionResponse]
    total: int


# ==================== AUTHENTICATION SCHEMAS ====================

class VerifyPasswordRequest(BaseModel):
    """Request to verify password for step-up authentication"""
    password: str = Field(..., min_length=1, description="User's current password")


class VerifyPasswordResponse(BaseModel):
    """Response after successful password verification"""
    success: bool
    message: str
    expires_in_minutes: int


# ==================== DASHBOARD SCHEMAS ====================

class DashboardStatsResponse(BaseModel):
    total_users: int
    active_users_7d: int
    active_users_30d: int
    new_users_7d: int
    premium_users: int
    oauth_users: int
    active_sessions: int  # Currently logged in users
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
    
    # LLM usage metrics
    total_llm_calls: int
    total_llm_cost: float
    llm_calls_24h: int
    llm_calls_7d: int
    llm_calls_30d: int
    llm_cost_24h: float
    llm_cost_7d: float
    llm_cost_30d: float
    
    avg_api_response_time: Optional[float] = None
    error_rate_24h: Optional[float] = None


class SystemHealthResponse(BaseModel):
    # LLM usage metrics
    total_llm_calls: int
    total_llm_cost: float
    llm_calls_24h: int
    llm_calls_7d: int
    llm_calls_30d: int
    llm_cost_24h: float
    llm_cost_7d: float
    llm_cost_30d: float
    
    # Cache metrics
    cache_hits_24h: int
    cache_misses_24h: int
    cache_hit_rate: float
    cache_size_mb: float
    
    # Database metrics
    db_size_mb: float
    db_connection_pool_size: int
    db_connection_pool_available: int
    
    # API metrics
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


# ==================== ADMIN LOG SCHEMAS ====================

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
    logs: List[AdminLogResponse]
    total: int
    page: int
    page_size: int
