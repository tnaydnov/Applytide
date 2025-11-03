"""
Reminder service dependencies.

Provides dependency injection for reminder management with Google Calendar integration
and AI-powered preparation tips (Pro/Premium feature).
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...domain.reminders.service import ReminderService
from ...infra.repositories.reminders_sqlalchemy import ReminderSQLARepository, ReminderNoteSQLARepository
from ...infra.external.google_calendar_gateway import GoogleCalendarGateway
from ...infra.external.ai_preparation_service import AIPreparationService
from ...infra.notifications.email_service import EmailService
from ...infra.logging import get_logger
from .applications import get_application_service
from ...domain.applications.service import ApplicationService

logger = get_logger(__name__)


def get_reminder_service(
    db: Session = Depends(get_db),
    app_service: ApplicationService = Depends(get_application_service)
) -> ReminderService:
    """
    Provide ReminderService with reminder management, Google Calendar, and AI features.
    
    Constructs ReminderService with repositories, Google Calendar gateway, and
    optional AI preparation service for Pro/Premium features.
    
    Args:
        db: Database session from FastAPI dependency injection
        app_service: Application service for fetching job/resume data
    
    Returns:
        ReminderService: Configured service for reminder operations
    
    Components:
        - ReminderSQLARepository: Reminder persistence
        - ReminderNoteSQLARepository: Reminder notes management
        - GoogleCalendarGateway: Google Calendar API integration (wrapped)
        - AIPreparationService: AI-powered interview prep tips (Pro/Premium)
        - EmailService: Email notifications with AI tips
        - ApplicationService: Job and resume data for AI analysis
    
    Features:
        - Reminder CRUD operations
        - Google Calendar two-way sync
        - Reminder notes and history
        - Due date management
        - Application-linked reminders
        - AI-powered preparation tips (Pro/Premium)
        - Immediate email delivery with tips
    
    AI Preparation Tips (Pro/Premium):
        - Personalized interview preparation advice
        - Company research and role analysis
        - Resume-based candidate assessment
        - Event-specific recommendations
        - Immediate email delivery on reminder creation
        - Powered by GPT-4o-mini
    
    Calendar Integration:
        - OAuth2 authentication with Google
        - Automatic token refresh
        - Event synchronization (bidirectional)
        - Conflict resolution
        - Graceful degradation if calendar unavailable
    
    Gateway Wrapper:
        - Injects database session into all calendar operations
        - Maintains consistent interface
        - Simplifies service layer (no db parameter needed)
        - Allows for testing with mock gateway
    
    Raises:
        Exception: If repository or gateway construction fails
    
    Example:
        @router.post("/api/reminders")
        async def create_reminder(
            data: ReminderCreate,
            service: ReminderService = Depends(get_reminder_service),
            user: User = Depends(get_current_user)
        ):
            return await service.create_reminder(
                user_id=user.id,
                title=data.title,
                ai_prep_tips_enabled=data.ai_prep_tips_enabled
            )
    """
    try:
        logger.debug("Initializing ReminderService with AI features")
        
        reminders = ReminderSQLARepository(db)
        notes = ReminderNoteSQLARepository(db)
        
        # Wrap gateway so it always receives db when called (currying)
        gateway = GoogleCalendarGateway()
        
        # Initialize AI preparation service (graceful degradation if unavailable)
        try:
            ai_prep_service = AIPreparationService()
            logger.debug("AI preparation service initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize AI service, Pro features disabled: {e}")
            ai_prep_service = None
        
        # Initialize email service (graceful degradation if unavailable)
        try:
            email_service = EmailService()
            logger.debug("Email service initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize email service: {e}")
            email_service = None
        
        logger.debug("Creating Google Calendar gateway wrapper")
        
        # Tiny shim to inject db into gateway calls
        class _GatewayWithDB:
            """Wrapper that automatically injects database session into calendar operations."""
            
            async def is_connected(self, *, user_id):
                """Check if user has connected Google Calendar."""
                return await gateway.is_connected(user_id=user_id, db=db)
            
            async def create_event(self, **kw):
                """Create calendar event with automatic db injection."""
                kw["db"] = db
                return await gateway.create_event(**kw)
            
            async def update_event(self, **kw):
                """Update calendar event with automatic db injection."""
                kw["db"] = db
                return await gateway.update_event(**kw)
            
            async def delete_event(self, **kw):
                """Delete calendar event with automatic db injection."""
                kw["db"] = db
                return await gateway.delete_event(**kw)
            
            async def get_event(self, **kw):
                """Get calendar event with automatic db injection."""
                kw["db"] = db
                return await gateway.get_event(**kw)
            
            async def list_events(self, **kw):
                """List calendar events with automatic db injection."""
                kw["db"] = db
                return await gateway.list_events(**kw)
        
        service = ReminderService(
            reminders=reminders, 
            notes=notes, 
            calendar=_GatewayWithDB(),
            ai_prep_service=ai_prep_service,
            email_service=email_service,
            app_service=app_service
        )
        
        logger.debug(
            "ReminderService initialized successfully",
            extra={
                "has_ai": ai_prep_service is not None,
                "has_email": email_service is not None,
                "has_app_service": app_service is not None
            }
        )
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize ReminderService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
