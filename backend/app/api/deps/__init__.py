"""
Service Dependency Injection for ApplyTide API.

This module provides FastAPI dependency injection functions for all domain services.
Each function constructs a service with its required infrastructure components
(repositories, gateways, external services) and manages their lifecycle.

Architecture:
    - Domain services encapsulate business logic
    - Infrastructure components provide technical capabilities
    - Dependency injection promotes testability and modularity
    - Services are constructed per-request with shared database session

Available Services:
    - JobService: Job and company management with search
    - DocumentService: Resume/cover letter handling with AI generation
    - ApplicationService: Job application tracking with attachments
    - JobExtractionService: Extract job details from URLs (with optional LLM)
    - ReminderService: Reminder management with Google Calendar sync
    - AnalyticsService: User analytics and statistics
    - OAuthService: OAuth token management for external services

Authentication & Authorization:
    - get_current_user: Required authentication for protected endpoints
    - get_current_user_optional: Optional authentication for public endpoints
    - get_admin_user: Admin role verification for admin-only endpoints

Database:
    - get_db: Database session dependency for direct DB access

Module Structure:
    - jobs.py: Job-related service dependencies
    - documents.py: Document service dependencies
    - applications.py: Application service dependencies
    - reminders.py: Reminder service dependencies
    - analytics.py: Analytics service dependencies
    - oauth.py: OAuth service dependencies
    - auth.py: Authentication dependencies
    - admin.py: Admin authorization dependencies

Lifecycle Management:
    - Synchronous services: Direct instantiation
    - Async services: Generator with cleanup in finally block
    - Database session: Shared across all services per request
    - External resources: Properly closed after request completion

Performance:
    - Services created lazily (only when endpoint requires them)
    - Database session reused across dependencies
    - Connection pooling managed by SQLAlchemy
    - Async operations for I/O-bound tasks

Error Handling:
    - Service construction failures logged and raised
    - Optional components degrade gracefully (e.g., LLM)
    - Resource cleanup guaranteed via try-finally blocks
    - Detailed error context for debugging

Example:
    from app.api.deps import get_job_service, get_current_user
    
    @router.get("/api/jobs/{job_id}")
    async def get_job(
        job_id: UUID,
        service: JobService = Depends(get_job_service),
        user: User = Depends(get_current_user)
    ):
        return await service.get_job(user.id, job_id)
"""
# Database session dependency
from ...db.session import get_db

# Re-export all service dependencies for backward compatibility
from .jobs import get_job_service, get_job_extraction_service
from .documents import get_document_service
from .applications import get_application_service
from .reminders import get_reminder_service
from .analytics import get_analytics_service
from .oauth import get_oauth_service
from .auth import get_current_user, get_current_user_optional
from .admin import get_admin_user, get_admin_service

__all__ = [
    # Database
    "get_db",
    # Service dependencies
    "get_job_service",
    "get_job_extraction_service",
    "get_document_service",
    "get_application_service",
    "get_reminder_service",
    "get_analytics_service",
    "get_oauth_service",
    # Authentication & authorization
    "get_current_user",
    "get_current_user_optional",
    "get_admin_user",
    "get_admin_service",
]
