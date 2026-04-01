"""
Common response schemas shared across multiple routers.

These schemas provide typed response_model definitions for FastAPI endpoints
that return simple message/success/error shapes.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Generic responses ────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    """Simple message response for mutations that return a confirmation."""
    message: str


class SuccessResponse(BaseModel):
    """Generic success response with optional message."""
    success: bool = True
    message: str


class SuccessMessageResponse(BaseModel):
    """Success flag + message, used for actions like storing agreements."""
    success: bool = True
    message: str


class ErrorLogResponse(BaseModel):
    """Response after logging a frontend error."""
    status: str
    id: Optional[str] = None
    error: Optional[str] = None


# ── Admin action responses ───────────────────────────────────────────────

class AdminUserDeleteResponse(BaseModel):
    success: bool
    message: str
    deleted_user_id: UUID


class SubscriptionUpdateResponse(BaseModel):
    success: bool
    message: str
    user_id: UUID
    subscription_plan: str
    subscription_status: str
    subscription_ends_at: Optional[datetime] = None


class RoleChangeResponse(BaseModel):
    success: bool
    message: str
    user_id: UUID
    old_role: str
    new_role: str


class SessionsRevokedResponse(BaseModel):
    success: bool
    message: str
    user_id: UUID
    sessions_revoked: int


class SessionRevokeResponse(BaseModel):
    success: bool
    message: str
    session_id: str
    user_id: str


class SecurityEventItem(BaseModel):
    """Single security event in the admin security dashboard."""
    model_config = {"from_attributes": True}

    id: Optional[Any] = None
    event_type: Optional[str] = None
    severity: Optional[str] = None
    user_id: Optional[Any] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[datetime] = None


class PaginatedSecurityEventsResponse(BaseModel):
    items: List[SecurityEventItem] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0


class ErrorDetailResponse(BaseModel):
    """Detailed view of a single error log entry."""
    id: Any
    timestamp: Optional[str] = None
    level: Optional[str] = None
    message: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    user_id: Optional[str] = None
    user: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    duration_ms: Optional[float] = None
    metadata: Optional[Any] = None


# ── Profile responses ────────────────────────────────────────────────────

class ProfileCompletenessResponse(BaseModel):
    is_complete: bool
    completeness_percentage: int
    message: str


class WelcomeModalResponse(BaseModel):
    message: str
    has_seen_welcome_modal: bool
    welcome_modal_seen_at: Optional[datetime] = None


class AccountDeletionResponse(BaseModel):
    message: str
    deleted_user_id: str
    deletion_timestamp: str


class JobPreferencesResponse(BaseModel):
    company_size: List[str] = []
    company_stage: List[str] = []
    company_culture: List[str] = []
    team_size: str = "medium"
    management_interest: bool = False


class CareerGoalsResponse(BaseModel):
    short_term_goals: List[str] = []
    long_term_goals: List[str] = []
    career_path: str = ""


# ── Document responses ───────────────────────────────────────────────────

class DocumentOptimizationResponse(BaseModel):
    optimized_content: str
    optimization_summary: str
    improvements_made: List[str] = []


class CoverLetterGenerationResponse(BaseModel):
    content: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    key_highlights: List[str] = []
    word_count: Optional[int] = None
    tone_applied: Optional[str] = None


class MissingFilesResponse(BaseModel):
    missing_count: int
    missing_ids: List[str] = []
    total_documents: int


class CleanupResponse(BaseModel):
    cleaned_count: int
    cleaned_ids: List[str] = []


# ── Search responses ─────────────────────────────────────────────────────

class SearchSuggestionsResponse(BaseModel):
    suggestions: List[str] = []


# ── Auth / Security responses ────────────────────────────────────────────

class SecuritySettingsResponse(BaseModel):
    two_factor_enabled: bool = False
    active_sessions: int = 0
    last_password_change: Optional[str] = None
    login_history: List[Any] = []


# ── Activity responses ───────────────────────────────────────────────────

class ActivityItem(BaseModel):
    model_config = {"from_attributes": True}

    id: Optional[Any] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[Any] = None
    details: Optional[Any] = None
    created_at: Optional[datetime] = None
    ip_address: Optional[str] = None


class ActivityLogResponse(BaseModel):
    activities: List[ActivityItem] = []
    total: int = 0
    page: int = 1
    limit: int = 20


# ── Profile responses ───────────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    """Typed response for UserProfile ORM object."""
    id: UUID
    user_id: UUID
    preferred_locations: Optional[Any] = None
    country: Optional[str] = None
    remote_preference: Optional[str] = None
    target_roles: Optional[Any] = None
    target_industries: Optional[Any] = None
    experience_level: Optional[str] = None
    skills: Optional[Any] = None
    career_goals: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
