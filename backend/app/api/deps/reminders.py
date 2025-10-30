"""
Reminder service dependencies.

Provides dependency injection for reminder management with Google Calendar integration.
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...domain.reminders.service import ReminderService
from ...infra.repositories.reminders_sqlalchemy import ReminderSQLARepository, ReminderNoteSQLARepository
from ...infra.external.google_calendar_gateway import GoogleCalendarGateway
from ...infra.logging import get_logger

logger = get_logger(__name__)


def get_reminder_service(db: Session = Depends(get_db)) -> ReminderService:
    """
    Provide ReminderService with reminder management and Google Calendar integration.
    
    Constructs ReminderService with repositories and a wrapped Google Calendar gateway
    that automatically injects the database session into all calendar operations.
    
    Args:
        db: Database session from FastAPI dependency injection
    
    Returns:
        ReminderService: Configured service for reminder operations
    
    Components:
        - ReminderSQLARepository: Reminder persistence
        - ReminderNoteSQLARepository: Reminder notes management
        - GoogleCalendarGateway: Google Calendar API integration (wrapped)
        - _GatewayWithDB: Shim that injects db into gateway calls
    
    Features:
        - Reminder CRUD operations
        - Google Calendar two-way sync
        - Reminder notes and history
        - Due date management
        - Application-linked reminders
        - Calendar event creation/updates
    
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
    
    Performance:
        - Calendar operations cached when possible
        - Batch operations for multiple reminders
        - Async operations for API calls
        - Token refresh handled transparently
    
    Security:
        - OAuth tokens stored encrypted
        - User isolation enforced
        - Calendar access scoped appropriately
        - Refresh tokens rotated
    
    Example:
        @router.post("/api/reminders")
        async def create_reminder(
            data: ReminderCreate,
            service: ReminderService = Depends(get_reminder_service),
            user: User = Depends(get_current_user)
        ):
            return await service.create_reminder(user.id, data)
    """
    try:
        logger.debug("Initializing ReminderService")
        
        reminders = ReminderSQLARepository(db)
        notes = ReminderNoteSQLARepository(db)
        
        # Wrap gateway so it always receives db when called (currying)
        gateway = GoogleCalendarGateway()
        
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
            calendar=_GatewayWithDB()
        )
        
        logger.debug("ReminderService initialized successfully")
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize ReminderService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
