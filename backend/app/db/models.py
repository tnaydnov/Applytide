import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, Boolean, ForeignKey, UniqueConstraint, JSON, Column, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column



from .base import Base
from .session import engine

IS_POSTGRES = engine.dialect.name == "postgresql"
JSONList = JSONB if IS_POSTGRES else JSONB  # keep JSONB when available; fallback above if you add SQLite JSON

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class UserProfile(Base):
    """Simplified user profile for AI personalization"""
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    # Geographic Preferences
    preferred_locations = Column(JSON)   # ["San Francisco, CA", "Remote", ...]
    country = Column(String)
    remote_preference = Column(String)   # "remote_only", "hybrid", "onsite", "any"

    # Career Preferences
    target_roles = Column(JSON)
    target_industries = Column(JSON)
    experience_level = Column(String)

    # Skills and Career Goals
    skills = Column(JSON)
    career_goals = Column(JSON)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ---------- Users ----------
class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    
    # Profile Information
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(200), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    
    # Account Status
    is_premium: Mapped[bool] = mapped_column(default=False, nullable=False)
    premium_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # OAuth Integration
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    google_avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_oauth_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Settings & Preferences
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    notification_email: Mapped[bool] = mapped_column(default=True, nullable=False)
    notification_push: Mapped[bool] = mapped_column(default=True, nullable=False)
    theme_preference: Mapped[str] = mapped_column(String(20), default="dark", nullable=False)
    
    # Calendar & API Access
    calendar_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    
    # Onboarding & User Experience
    has_seen_welcome_modal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    welcome_modal_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Legal Agreements (GDPR/CCPA Compliance)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    privacy_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terms_version: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g., "1.0", "2.0"
    acceptance_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 support
    
    # Account Deletion (7-day Recovery Period)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # Set to deleted_at + 7 days
    deletion_recovery_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # "google", "github", etc.
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    token_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Companies ----------
class Company(Base):
    __tablename__ = "companies"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Jobs ----------
class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    remote_type: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    job_type: Mapped[str | None] = mapped_column(String(40), nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements: Mapped[list[str]] = mapped_column(JSONList, nullable=False, default=list)
    skills: Mapped[list[str]] = mapped_column(JSONList, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False, index=True)


# ---------- Resumes ----------
class Resume(Base):
    __tablename__ = "resumes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Applications ----------
PIPELINE_STATUSES = [
    "Saved",
    "Applied",
    "Phone Screen",
    "Tech",
    "On-site",
    "Offer",
    "Accepted",
    "Rejected",
]


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    resume_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="Applied", nullable=False, index=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Stages (timeline entries) ----------
class Stage(Base):
    __tablename__ = "stages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g., "Phone Screen"
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(60), nullable=True)  # "passed"/"failed"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


class Note(Base):
    __tablename__ = "notes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


class MatchResult(Base):
    __tablename__ = "match_results"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    resume_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0..100 stored as int
    keywords_present: Mapped[str | None] = mapped_column(Text, nullable=True)   # comma-joined
    keywords_missing: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Application Attachments ----------
# models.py

class ApplicationAttachment(Base):
    __tablename__ = "application_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    document_type: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True, default="other")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)



# ---------- Auth Enhancement Tables ----------
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    family_id: Mapped[str] = mapped_column(String(36), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


class EmailAction(Base):
    __tablename__ = "email_actions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # VERIFY, RESET
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

class Reminder(Base):
    __tablename__ = "reminders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    application_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    google_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    meet_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    
    # Email notification settings
    email_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notification_schedule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    event_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default="general")
    last_notification_sent: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_timezone: Mapped[str | None] = mapped_column(String(50), nullable=True, default="UTC")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'google_event_id', name='uq_user_google_event'),
    )
    
# ---------- User Preferences ----------
class UserPreferences(Base):
    __tablename__ = "user_preferences"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    preference_key: Mapped[str] = mapped_column(String(255), nullable=False)
    preference_value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Reminder Notes ----------
class ReminderNote(Base):
    __tablename__ = "reminder_notes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reminder_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reminders.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


# ---------- Application Logs ----------
class ApplicationLog(Base):
    """Track application events, errors, and user actions
    
    Stores structured application logs for debugging, monitoring, and analytics.
    
    Used for:
    - Authentication events (login, logout, registration)
    - Business operations (job created, application submitted)
    - Errors and exceptions
    - Performance monitoring
    - Security events
    """
    __tablename__ = "application_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False, index=True)
    
    # Log metadata
    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    logger: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # Module name
    message: Mapped[str] = mapped_column(Text, nullable=False)  # Log message
    
    # Request context (set by middleware)
    request_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)  # For tracing requests
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # HTTP request info
    endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)  # API endpoint
    method: Mapped[str | None] = mapped_column(String(10), nullable=True)  # GET, POST, etc.
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)  # HTTP status
    
    # Client info
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Source code location
    module: Mapped[str | None] = mapped_column(String(255), nullable=True)
    function: Mapped[str | None] = mapped_column(String(255), nullable=True)
    line_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Exception info (if error)
    exception_type: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    exception_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    stack_trace: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Additional structured data
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # Any extra context


class LLMUsage(Base):
    """Track LLM API usage for cost monitoring and analytics
    
    Tracks all LLM API calls (OpenAI, etc.) to monitor:
    - Token usage and costs
    - Performance metrics
    - Feature usage patterns
    - User-specific costs for premium users
    """
    __tablename__ = "llm_usage"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False, index=True)
    
    # User context
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Provider info
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # "openai", "anthropic"
    model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # "gpt-4o-mini", "gpt-4o", "claude-3"
    endpoint: Mapped[str] = mapped_column(String(200), nullable=False)  # "job_extraction", "cover_letter_generation", "resume_analysis_general", "resume_analysis_job"
    usage_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # "chrome_extension", "cover_letter", "resume_general", "resume_job"
    
    # Token usage
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Cost tracking (USD)
    # NOTE: estimated_cost is calculated using OpenAI's published pricing and token counts.
    # This is typically accurate within 1-2%, but for exact costs check OpenAI billing dashboard.
    # Cost may differ due to: pricing updates, enterprise discounts, cached tokens, rounding.
    estimated_cost: Mapped[float] = mapped_column(Float, nullable=False)  # Calculated based on model pricing
    
    # Performance
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)  # Latency in milliseconds
    
    # Status
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Additional context
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # Feature-specific metadata
