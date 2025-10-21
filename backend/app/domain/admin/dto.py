# backend/app/domain/admin/dto.py
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Any
from uuid import UUID


@dataclass
class UserSummaryDTO:
    """Summary info for user list in admin"""
    id: UUID
    email: str
    full_name: Optional[str]
    is_premium: bool
    is_admin: bool
    is_oauth_user: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    # Computed stats
    total_applications: int = 0
    total_documents: int = 0
    total_jobs: int = 0


@dataclass
class UserDetailDTO:
    """Detailed user info for admin inspection"""
    id: UUID
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
    # Computed stats
    total_applications: int = 0
    total_documents: int = 0
    total_jobs: int = 0
    total_reminders: int = 0
    recent_activity: list = None


@dataclass
class DashboardStatsDTO:
    """Overview statistics for admin dashboard"""
    # User metrics
    total_users: int
    active_users_7d: int
    active_users_30d: int
    new_users_7d: int
    premium_users: int
    oauth_users: int
    active_sessions: int  # Currently logged in users
    
    # Application metrics
    total_applications: int
    applications_7d: int
    applications_30d: int
    
    # Document metrics
    total_documents: int
    documents_analyzed: int
    analysis_cache_hit_rate: float
    
    # Job metrics
    total_jobs: int
    jobs_7d: int
    
    # Reminder metrics
    total_reminders: int
    reminders_7d: int
    
    # LLM usage metrics
    total_llm_calls: int
    total_llm_cost: float  # in USD
    llm_calls_24h: int
    llm_calls_7d: int
    llm_calls_30d: int
    llm_cost_24h: float
    llm_cost_7d: float
    llm_cost_30d: float
    
    # System health
    avg_api_response_time: Optional[float] = None
    error_rate_24h: Optional[float] = None


@dataclass
class SystemHealthDTO:
    """System health metrics"""
    # LLM usage
    llm_calls_24h: int
    llm_calls_7d: int
    llm_cost_24h: float
    llm_cost_7d: float
    llm_cost_30d: float
    
    # Cache performance
    cache_hits_24h: int
    cache_misses_24h: int
    cache_hit_rate: float
    cache_size_mb: float
    
    # Database
    db_size_mb: float
    db_connection_pool_size: int
    db_connection_pool_available: int
    
    # API health
    total_api_calls_24h: int
    avg_response_time_ms: float
    error_count_24h: int
    error_rate: float
    
    # Recent errors
    recent_errors: list = None


@dataclass
class AnalyticsDTO:
    """Analytics data for admin"""
    # Feature usage
    feature_usage: dict  # {"document_analysis": 1234, "job_tracking": 5678, ...}
    
    # User engagement
    daily_active_users: list  # [{date, count}, ...]
    weekly_active_users: list
    
    # Application funnel
    application_statuses: dict  # {"Applied": 100, "Interview": 50, ...}
    
    # Document analysis
    analysis_by_day: list  # [{date, count, cached_count}, ...]
    
    # Top users by activity
    top_users: list  # [{user_id, email, activity_score}, ...]


@dataclass
class AdminLogDTO:
    """Admin action log entry
    
    admin_id can be null if the admin user was deleted,
    but admin_email is always preserved for audit trail.
    """
    id: UUID
    admin_id: Optional[UUID]  # Nullable - admin may have been deleted
    admin_email: str  # Always preserved
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


@dataclass
class UserActivityDTO:
    """Recent activity for a specific user"""
    timestamp: datetime
    action: str
    details: dict
    ip_address: Optional[str]
