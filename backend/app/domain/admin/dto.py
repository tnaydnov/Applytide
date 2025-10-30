"""
Admin Data Transfer Objects (DTOs)

Pydantic models for admin panel data transfer between service layer and API layer.
All DTOs use Pydantic v2 with ConfigDict for clean serialization from SQLAlchemy models.

Categories:
    - Dashboard: Quick stats, activity feed, charts
    - User Management: User listings, details, pagination
    - Error Monitoring: Error logs, summaries, pagination
    - Session Management: Active sessions, statistics
    - System Health: Database, storage, API metrics
    - LLM Usage: Usage tracking, statistics, pagination
    - Security: Security monitoring statistics

Design Patterns:
    - from_attributes=True: Enables ORM model conversion
    - Optional fields: Use None defaults for nullable database columns
    - Computed fields: Populated by service layer, not from DB
    - Pagination DTOs: Standard structure (items, total, page, page_size, total_pages)

Example:
    from app.domain.admin import dto
    
    # Service layer
    stats = dto.DashboardStatsDTO(
        total_users=100,
        premium_users=25,
        ...
    )
    
    # API layer
    return stats.model_dump()  # Converts to dict for JSON response
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD METRICS - Overview statistics and visualizations
# ═══════════════════════════════════════════════════════════════════════════

class DashboardStatsDTO(BaseModel):
    """
    Quick statistics for admin dashboard overview.
    
    Displays high-level metrics about platform usage and health.
    Updated in real-time via AdminService.get_dashboard_stats().
    
    Attributes:
        total_users: Total registered users (all time)
        premium_users: Users with active premium subscriptions
        new_users_today: New registrations today (UTC)
        new_users_this_week: New registrations this week (Monday-Sunday UTC)
        total_applications: Total job applications submitted
        active_users: Users with activity in last 24 hours
        recent_errors_count: ERROR/CRITICAL logs in last 24 hours
    """
    total_users: int
    premium_users: int
    new_users_today: int
    new_users_this_week: int
    total_applications: int
    active_users: int
    recent_errors_count: int
    
    model_config = ConfigDict(from_attributes=True)


class ActivityEventDTO(BaseModel):
    """
    Single activity event for real-time activity feed.
    
    Represents a significant platform event (user action, error, etc.).
    Displayed in chronological order on admin dashboard.
    
    Attributes:
        id: Unique event identifier
        timestamp: When event occurred (UTC)
        user_email: Email of user who triggered event (if applicable)
        user_id: ID of user who triggered event (if applicable)
        event_type: Category of event (e.g., "user_registered", "application_created", "error")
        message: Human-readable event description
        level: Log level (INFO, WARNING, ERROR, CRITICAL)
    """
    id: uuid.UUID
    timestamp: datetime
    user_email: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    event_type: str
    message: str
    level: str
    
    model_config = ConfigDict(from_attributes=True)


class ChartDataPointDTO(BaseModel):
    """
    Single data point for time-series charts.
    
    Generic structure for any date-based metric visualization.
    
    Attributes:
        date: ISO 8601 date string (YYYY-MM-DD)
        count: Numeric value for this date
    """
    date: str
    count: int


class DashboardChartsDTO(BaseModel):
    """
    Time-series chart data for dashboard visualizations.
    
    Provides trend data for key metrics over the last 7 days.
    Used to render line/bar charts showing platform activity.
    
    Attributes:
        signups_last_7_days: Daily new user registrations
        applications_last_7_days: Daily job applications submitted
        errors_last_7_days: Daily error count (ERROR + CRITICAL levels)
    """
    signups_last_7_days: List[ChartDataPointDTO]
    applications_last_7_days: List[ChartDataPointDTO]
    errors_last_7_days: List[ChartDataPointDTO]
    
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT - User listings, details, and related data
# ═══════════════════════════════════════════════════════════════════════════

class UserListItemDTO(BaseModel):
    """
    User summary for paginated user list view.
    
    Lightweight representation with key user info and computed metrics.
    Used in admin panel user management table.
    
    Attributes:
        id: User UUID
        email: User email address
        role: User role (user, admin, etc.)
        is_premium: Whether user has active premium subscription
        premium_expires_at: Premium expiration datetime (None if not premium)
        email_verified_at: Email verification datetime (None if unverified)
        is_oauth_user: True if user registered via OAuth (Google, etc.)
        last_login_at: Most recent login timestamp
        created_at: Account creation timestamp
        active_sessions_count: Number of active sessions (computed)
        total_applications: Number of job applications (computed)
    """
    id: uuid.UUID
    email: str
    role: str
    is_premium: bool
    premium_expires_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    is_oauth_user: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    
    # Computed fields (populated by service layer)
    active_sessions_count: int = 0
    total_applications: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserDetailDTO(BaseModel):
    """
    Comprehensive user information for detail view.
    
    Full user profile with stats and metadata.
    Used when viewing individual user details in admin panel.
    
    Attributes:
        # Core Identity
        id: User UUID
        email: User email address
        role: User role (user, admin, etc.)
        
        # Subscription
        is_premium: Whether user has active premium subscription
        premium_expires_at: Premium expiration datetime
        
        # Authentication
        email_verified_at: Email verification datetime
        is_oauth_user: True if registered via OAuth
        google_id: Google OAuth ID (if OAuth user)
        
        # Profile Information
        avatar_url: Profile picture URL
        location: User location (city, country)
        timezone: User timezone (e.g., "America/New_York")
        phone: Phone number
        linkedin_url: LinkedIn profile URL
        website: Personal website URL
        
        # Activity Timestamps
        last_login_at: Most recent login
        created_at: Account creation
        updated_at: Last profile update
        
        # Computed Statistics (from service layer)
        active_sessions_count: Active session count
        total_applications: Job applications count
        total_jobs: Saved jobs count
        total_reminders: Reminders count
        total_documents: Documents count
    """
    # Core Identity
    id: uuid.UUID
    email: str
    role: str
    
    # Subscription
    is_premium: bool
    premium_expires_at: Optional[datetime] = None
    
    # Authentication
    email_verified_at: Optional[datetime] = None
    is_oauth_user: bool
    google_id: Optional[str] = None
    
    # Profile Information
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    
    # Activity Timestamps
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed Statistics
    active_sessions_count: int = 0
    total_applications: int = 0
    total_jobs: int = 0
    total_reminders: int = 0
    total_documents: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserApplicationDTO(BaseModel):
    """
    User's job application summary.
    
    Lightweight application info for user detail view.
    
    Attributes:
        id: Application UUID
        job_title: Job title applied for
        company_name: Company name
        current_stage: Current application stage/status
        applied_date: Date applied (if available)
        created_at: Application creation timestamp
    """
    id: uuid.UUID
    job_title: str
    company_name: str
    current_stage: str
    applied_date: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserJobDTO(BaseModel):
    """
    User's saved job summary.
    
    Lightweight saved job info for user detail view.
    
    Attributes:
        id: Job UUID
        title: Job title
        company: Company name
        location: Job location (if available)
        created_at: When job was saved
    """
    id: uuid.UUID
    title: str
    company: str
    location: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedUsersDTO(BaseModel):
    """
    Paginated user list response.
    
    Standard pagination wrapper for user listings.
    
    Attributes:
        items: List of user items for current page
        total: Total number of users matching filter
        page: Current page number (1-indexed)
        page_size: Number of items per page
        total_pages: Total number of pages
    """
    items: List[UserListItemDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════
# ERROR MONITORING - Error logs, summaries, and diagnostics
# ═══════════════════════════════════════════════════════════════════════════

class ErrorLogDTO(BaseModel):
    """
    Single error log entry.
    
    Represents a logged error/warning event for monitoring and debugging.
    
    Attributes:
        id: Log entry UUID
        timestamp: When error occurred (UTC)
        level: Log level (WARNING, ERROR, CRITICAL)
        message: Error message
        user_id: ID of user associated with error (if applicable)
        user_email: Email of user (if applicable)
        endpoint: API endpoint where error occurred (if API error)
        status_code: HTTP status code (if API error)
    """
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
    """
    Error statistics summary.
    
    Aggregated error metrics for monitoring dashboard.
    
    Attributes:
        total_errors: Total error count (all time)
        critical_count: CRITICAL level errors
        error_count: ERROR level errors
        warning_count: WARNING level errors
        errors_today: Errors logged today (UTC)
        errors_this_week: Errors logged this week (Monday-Sunday UTC)
    """
    total_errors: int
    critical_count: int
    error_count: int
    warning_count: int
    errors_today: int
    errors_this_week: int
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedErrorsDTO(BaseModel):
    """
    Paginated error logs response.
    
    Standard pagination wrapper for error log listings.
    
    Attributes:
        items: List of error log entries for current page
        total: Total number of errors matching filter
        page: Current page number (1-indexed)
        page_size: Number of items per page
        total_pages: Total number of pages
    """
    items: List[ErrorLogDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════
# SESSION MANAGEMENT - Active sessions and security monitoring
# ═══════════════════════════════════════════════════════════════════════════

class SessionDTO(BaseModel):
    """
    Active user session information.
    
    Represents an authenticated user session for security monitoring.
    
    Attributes:
        id: Session UUID
        user_id: User who owns this session
        user_email: User email (for display)
        created_at: When session was created
        expires_at: When session expires
        last_used_at: Last activity timestamp
        device_info: User agent or device information
    """
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    created_at: datetime
    expires_at: datetime
    last_used_at: Optional[datetime] = None
    device_info: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionStatsDTO(BaseModel):
    """
    Session statistics summary.
    
    Aggregated session metrics for monitoring.
    
    Attributes:
        total_active: Count of currently active sessions
        expiring_soon: Sessions expiring within 24 hours
        expired_uncleaned: Expired sessions not yet cleaned up
    """
    total_active: int
    expiring_soon: int
    expired_uncleaned: int
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedSessionsDTO(BaseModel):
    """
    Paginated sessions response.
    
    Standard pagination wrapper for session listings.
    
    Attributes:
        items: List of session entries for current page
        total: Total number of sessions matching filter
        page: Current page number (1-indexed)
        page_size: Number of items per page
        total_pages: Total number of pages
    """
    items: List[SessionDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════
# SYSTEM HEALTH - Infrastructure and resource monitoring
# ═══════════════════════════════════════════════════════════════════════════

class DatabaseHealthDTO(BaseModel):
    """
    Database health and performance metrics.
    
    Monitors database size, connections, and table statistics.
    
    Attributes:
        total_size_mb: Total database size in megabytes
        table_count: Number of tables in database
        connection_pool_size: Configured connection pool size
        active_connections: Currently active database connections
        users_count: Row count in users table
        applications_count: Row count in applications table
        jobs_count: Row count in jobs table
        logs_count: Row count in logs table
        sessions_count: Row count in sessions table
    """
    total_size_mb: float
    table_count: int
    connection_pool_size: int
    active_connections: int
    
    # Table row counts
    users_count: int
    applications_count: int
    jobs_count: int
    logs_count: int
    sessions_count: int
    
    model_config = ConfigDict(from_attributes=True)


class StorageUsageDTO(BaseModel):
    """
    File storage usage breakdown.
    
    Monitors uploaded files and storage consumption.
    
    Attributes:
        total_documents: Total number of uploaded documents
        total_size_mb: Total storage used in megabytes
        documents_by_user: Average documents per user
        avatars_count: Number of user avatars stored
    """
    total_documents: int
    total_size_mb: float
    documents_by_user: int
    avatars_count: int
    
    model_config = ConfigDict(from_attributes=True)


class APIHealthDTO(BaseModel):
    """
    API service health and performance metrics.
    
    Monitors API availability, request volume, and response times.
    
    Attributes:
        status: Service status ("healthy", "degraded", "down")
        uptime_seconds: Service uptime in seconds
        requests_last_hour: Request count in last hour
        errors_last_hour: Error count in last hour
        avg_response_time_ms: Average response time in milliseconds
    """
    status: str
    uptime_seconds: float
    requests_last_hour: int
    errors_last_hour: int
    avg_response_time_ms: float
    
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════
# LLM USAGE TRACKING - AI service usage monitoring and cost tracking
# ═══════════════════════════════════════════════════════════════════════════

class LLMUsageDTO(BaseModel):
    """
    Single LLM API call record.
    
    Tracks individual LLM requests for cost monitoring and debugging.
    
    Attributes:
        id: Usage record UUID
        timestamp: When API call was made (UTC)
        user_id: User who triggered the call (None for system calls)
        user_email: User email (for display)
        provider: LLM provider (e.g., "openai", "anthropic")
        model: Model used (e.g., "gpt-4", "claude-3")
        endpoint: API endpoint or feature that made the call
        usage_type: Type of usage (e.g., "completion", "embedding", "chat")
        prompt_tokens: Number of tokens in prompt
        completion_tokens: Number of tokens in completion
        total_tokens: Total tokens used (prompt + completion)
        estimated_cost: Estimated cost in USD
        response_time_ms: Response time in milliseconds
        success: Whether call succeeded
        error_message: Error message if failed
    """
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
    """
    Aggregated LLM usage statistics.
    
    Summary metrics for LLM usage monitoring and cost analysis.
    
    Attributes:
        total_calls: Total number of LLM API calls
        successful_calls: Number of successful calls
        failed_calls: Number of failed calls
        total_cost: Total estimated cost (USD)
        total_tokens: Total tokens consumed
        avg_response_time_ms: Average response time in milliseconds
        by_endpoint: Usage breakdown by API endpoint
        by_model: Usage breakdown by model
        by_usage_type: Usage breakdown by usage type
    
    Note:
        Breakdown lists contain dicts with keys:
        - endpoint/model/usage_type: Category name
        - calls: Number of calls
        - cost: Total cost
        - tokens: Total tokens (where applicable)
    """
    total_calls: int
    successful_calls: int
    failed_calls: int
    total_cost: float
    total_tokens: int
    avg_response_time_ms: int
    by_endpoint: list[dict]
    by_model: list[dict]
    by_usage_type: list[dict]
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedLLMUsageDTO(BaseModel):
    """
    Paginated LLM usage records response.
    
    Standard pagination wrapper for LLM usage listings.
    
    Attributes:
        items: List of LLM usage records for current page
        total: Total number of records matching filter
        page: Current page number (1-indexed)
        page_size: Number of items per page
        pages: Total number of pages
    """
    items: list[LLMUsageDTO]
    total: int
    page: int
    page_size: int
    pages: int
    
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════
# SECURITY MONITORING - Security events and threat detection
# ═══════════════════════════════════════════════════════════════════════════

class SecurityStatsDTO(BaseModel):
    """
    Security monitoring statistics.
    
    Aggregated security metrics for threat detection and monitoring.
    Tracks authentication failures, rate limiting, and security events.
    
    Attributes:
        failed_logins: Total failed login attempts
        unique_failed_ips: Number of unique IPs with failed logins
        rate_limit_violations: Total rate limit violations
        unique_rate_limit_ips: Number of unique IPs hitting rate limits
        token_revocations: Number of manually revoked tokens/sessions
    
    Usage:
        High values may indicate:
        - failed_logins: Brute force attacks
        - rate_limit_violations: API abuse or scraping attempts
        - token_revocations: Compromised accounts
    """
    failed_logins: int
    unique_failed_ips: int
    rate_limit_violations: int
    unique_rate_limit_ips: int
    token_revocations: int
    
    model_config = ConfigDict(from_attributes=True)
