"""
Reminder Service

Handles reminder lifecycle management including:
- Reminder creation with optional Google Calendar integration
- Google Calendar event import and synchronization
- Reminder updates with bidirectional Google sync
- Reminder deletion with cascade cleanup
- Note management for reminders
- Google Calendar connection status and event listing
- AI-powered interview preparation tips (Pro/Premium feature)

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, TYPE_CHECKING
from uuid import UUID
import logging

from .dto import ReminderDTO, ReminderNoteDTO
from .ports import IReminderRepo, IReminderNoteRepo, ICalendarGateway

if TYPE_CHECKING:
    from app.infra.external.ai_preparation_service import AIPreparationService
    from app.infra.notifications.email_service import EmailService
    from app.domain.applications.service import ApplicationService

logger = logging.getLogger(__name__)

# Constants
DEFAULT_REMINDER_DURATION_MINUTES = 30
DEFAULT_REMINDER_ADVANCE_HOURS = 1
MAX_TITLE_LENGTH = 500
MAX_DESCRIPTION_LENGTH = 5000
MAX_BODY_LENGTH = 10000
MAX_LIST_LIMIT = 1000
MAX_GOOGLE_EVENTS = 2500


class ReminderServiceError(Exception):
    """Base exception for reminder service operations."""
    pass


class ReminderValidationError(ReminderServiceError):
    """Raised when reminder validation fails."""
    pass


class ReminderNotFoundError(ReminderServiceError):
    """Raised when reminder is not found or access denied."""
    pass


class CalendarSyncError(ReminderServiceError):
    """Raised when Google Calendar synchronization fails."""
    pass


class NoteValidationError(ReminderServiceError):
    """Raised when note validation fails."""
    pass


class NoteNotFoundError(ReminderServiceError):
    """Raised when note is not found or access denied."""
    pass


# Legacy aliases for backward compatibility
class ReminderNotFound(ReminderNotFoundError): ...
class CalendarException(CalendarSyncError): ...

class ReminderService:
    """
    Reminder service with Google Calendar integration and AI preparation tips.
    
    Manages reminder lifecycle including creation, updates, deletion,
    and bidirectional Google Calendar synchronization. Also handles
    notes attached to reminders and AI-powered interview preparation
    tips for Pro/Premium users.
    """
    
    def __init__(
        self, 
        *, 
        reminders: IReminderRepo, 
        notes: IReminderNoteRepo, 
        calendar: ICalendarGateway,
        ai_prep_service: Optional["AIPreparationService"] = None,
        email_service: Optional["EmailService"] = None,
        app_service: Optional["ApplicationService"] = None
    ):
        """
        Initialize reminder service.
        
        Args:
            reminders: Reminder repository for persistence
            notes: Note repository for reminder notes
            calendar: Google Calendar gateway for event sync
            ai_prep_service: AI service for preparation tips (optional, for Pro features)
            email_service: Email service for sending tips (optional, for Pro features)
            app_service: Application service for fetching job data (optional, for Pro features)
        
        Raises:
            ValueError: If required dependencies are None
        """
        if not all([reminders, notes, calendar]):
            logger.error("ReminderService initialized with None dependencies")
            raise ValueError("Required dependencies (reminders, notes, calendar) must be provided")
        
        self.reminders = reminders
        self.notes = notes
        self.calendar = calendar
        self.ai_prep_service = ai_prep_service
        self.email_service = email_service
        self.app_service = app_service
        
        logger.debug(
            "ReminderService initialized successfully",
            extra={
                "has_ai_prep": ai_prep_service is not None,
                "has_email": email_service is not None,
                "has_app_service": app_service is not None
            }
        )

    # -------- Reminders --------
    
    async def create_reminder(
        self,
        *,
        user_id: UUID,
        title: str,
        description: Optional[str],
        due_date: Optional[datetime],
        application_id: Optional[UUID],
        create_google_event: bool = True,
        add_meet_link: bool = False,
        calendar_id: str = "primary",
        timezone_str: str = "UTC",
        email_notifications_enabled: bool = False,
        notification_schedule: Optional[dict] = None,
        event_type: Optional[str] = "general",
        user_timezone: Optional[str] = "UTC",
        ai_prep_tips_enabled: bool = False,
    ) -> ReminderDTO:
        """
        Create a new reminder with optional Google Calendar integration and AI prep tips.
        
        Checks for duplicates before creation. If create_google_event is True,
        creates a corresponding Google Calendar event with optional Meet link.
        If ai_prep_tips_enabled is True (Pro/Premium), will generate personalized prep tips.
        
        Args:
            user_id: User UUID
            title: Reminder title (max 500 chars)
            description: Optional reminder description (max 5000 chars)
            due_date: Due date/time (defaults to 1 hour from now if None)
            application_id: Optional linked application UUID
            create_google_event: Whether to create Google Calendar event
            add_meet_link: Whether to add Google Meet link to event
            calendar_id: Google Calendar ID (defaults to "primary")
            timezone_str: Timezone string for Google event (e.g., "America/New_York")
            email_notifications_enabled: Enable email notifications
            notification_schedule: Optional notification schedule dict
            event_type: Event type (e.g., "interview", "followup", "general")
            user_timezone: User's timezone for display
            ai_prep_tips_enabled: Enable AI prep tips (Pro/Premium feature)
        
        Returns:
            Created ReminderDTO (with google_event_id and meet_url if synced)
        
        Raises:
            ReminderValidationError: If title invalid or too long
            CalendarSyncError: If Google Calendar sync fails (non-fatal, reminder still created)
        
        Example:
            reminder = await service.create_reminder(
                user_id=UUID("..."),
                title="Follow up with hiring manager",
                description="Send thank you email",
                due_date=datetime.now(timezone.utc) + timedelta(days=1),
                create_google_event=True,
                add_meet_link=False,
                ai_prep_tips_enabled=True
            )
        """
        try:
            # Validate inputs
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            if not title or not isinstance(title, str):
                raise ReminderValidationError("title must be a non-empty string")
            
            title = title.strip()
            if len(title) > MAX_TITLE_LENGTH:
                logger.warning(
                    f"Title too long: {len(title)} chars",
                    extra={"user_id": str(user_id), "title_length": len(title)}
                )
                raise ReminderValidationError(
                    f"Title too long. Maximum {MAX_TITLE_LENGTH} characters, got {len(title)}"
                )
            
            if description and len(description) > MAX_DESCRIPTION_LENGTH:
                logger.warning(
                    f"Description too long: {len(description)} chars",
                    extra={"user_id": str(user_id), "description_length": len(description)}
                )
                raise ReminderValidationError(
                    f"Description too long. Maximum {MAX_DESCRIPTION_LENGTH} characters, got {len(description)}"
                )
            
            logger.debug(
                f"Creating reminder: {title}",
                extra={
                    "user_id": str(user_id),
                    "title": title,
                    "application_id": str(application_id) if application_id else None,
                    "create_google_event": create_google_event
                }
            )
            
            # Set default due date
            due = due_date or (datetime.now(timezone.utc) + timedelta(hours=DEFAULT_REMINDER_ADVANCE_HOURS))
            
            # Check for duplicates
            try:
                dup = self.reminders.find_duplicate(
                    user_id=user_id, title=title, application_id=application_id, due_date=due
                )
                if dup:
                    logger.info(
                        f"Duplicate reminder found, returning existing",
                        extra={"reminder_id": str(dup.id), "user_id": str(user_id)}
                    )
                    return dup
            except Exception as e:
                logger.warning(f"Duplicate check failed: {e}", exc_info=True)
                # Continue with creation
            
            # Create reminder in database
            try:
                r = self.reminders.create(
                    user_id=user_id, 
                    title=title, 
                    description=description, 
                    due_date=due, 
                    application_id=application_id,
                    email_notifications_enabled=email_notifications_enabled,
                    notification_schedule=notification_schedule,
                    event_type=event_type,
                    user_timezone=user_timezone,
                    ai_prep_tips_enabled=ai_prep_tips_enabled,
                )
                
                logger.debug(
                    f"Reminder created in database",
                    extra={
                        "reminder_id": str(r.id),
                        "user_id": str(user_id),
                        "ai_prep_enabled": ai_prep_tips_enabled
                    }
                )
            except Exception as e:
                logger.error(
                    f"Failed to create reminder in database: {e}",
                    extra={"user_id": str(user_id), "title": title},
                    exc_info=True
                )
                raise ReminderServiceError(f"Failed to create reminder: {e}")
            
            # Generate and send AI preparation tips if enabled (Pro/Premium feature)
            # Run in background so reminder creation returns immediately
            logger.debug(
                f"Checking AI prep tips eligibility",
                extra={
                    "reminder_id": str(r.id),
                    "ai_prep_tips_enabled": ai_prep_tips_enabled,
                    "application_id": str(application_id) if application_id else None,
                    "will_generate": ai_prep_tips_enabled and application_id is not None
                }
            )
            
            if ai_prep_tips_enabled and application_id:
                # Fire-and-forget: AI generation runs in background
                # This allows the API to return immediately and close the modal
                import asyncio
                asyncio.create_task(
                    self._generate_and_send_ai_tips(
                        reminder=r,
                        user_id=user_id,
                        application_id=application_id,
                        event_type=event_type
                    )
                )
            
            # Sync to Google Calendar if requested
            if create_google_event:
                try:
                    event_id, meet_url = await self.calendar.create_event(
                        user_id=user_id,
                        title=title,
                        description=description,
                        start=due,
                        end=due + timedelta(minutes=DEFAULT_REMINDER_DURATION_MINUTES),
                        calendar_id=calendar_id,
                        timezone_str=timezone_str,
                        add_meet_link=add_meet_link,
                        private_props={
                            "applytide": "1",
                            "reminder_id": str(r.id),
                            "application_id": str(application_id or "")
                        },
                    )
                    
                    r = self.reminders.set_google_fields(
                        user_id=user_id,
                        reminder_id=r.id,
                        google_event_id=event_id,
                        meet_url=meet_url
                    )
                    
                    logger.info(
                        f"Google Calendar event created",
                        extra={
                            "reminder_id": str(r.id),
                            "google_event_id": event_id,
                            "has_meet_link": bool(meet_url)
                        }
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to create Google Calendar event: {e}",
                        extra={"reminder_id": str(r.id), "user_id": str(user_id)},
                        exc_info=True
                    )
                    # Non-fatal: reminder is still created, just not synced
                    logger.warning(f"Reminder created without Google Calendar sync")
            
            logger.info(
                f"Reminder created successfully",
                extra={
                    "reminder_id": str(r.id),
                    "user_id": str(user_id),
                    "title": title,
                    "google_synced": bool(r.google_event_id)
                }
            )
            
            return r
            
        except (ReminderValidationError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error creating reminder: {e}",
                extra={"user_id": str(user_id), "title": title},
                exc_info=True
            )
            raise ReminderServiceError(f"Failed to create reminder: {e}")

    async def import_from_google_event(
        self, *, user_id: UUID, google_event_id: str, application_id: Optional[UUID]
    ) -> ReminderDTO:
        """
        Import a Google Calendar event as a reminder.
        
        Fetches event details from Google Calendar and creates a corresponding
        reminder without creating a new calendar event (to avoid duplication).
        
        Args:
            user_id: User UUID
            google_event_id: Google Calendar event ID
            application_id: Optional linked application UUID
        
        Returns:
            Created ReminderDTO linked to the Google event
        
        Raises:
            ReminderValidationError: If google_event_id invalid
            CalendarSyncError: If Google Calendar fetch fails
            ReminderServiceError: If reminder creation fails
        
        Example:
            reminder = await service.import_from_google_event(
                user_id=UUID("..."),
                google_event_id="abc123def456",
                application_id=UUID("...")
            )
        """
        try:
            # Validate inputs
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            if not google_event_id or not isinstance(google_event_id, str):
                raise ReminderValidationError("google_event_id must be a non-empty string")
            
            logger.debug(
                f"Importing Google Calendar event: {google_event_id}",
                extra={"user_id": str(user_id), "google_event_id": google_event_id}
            )
            
            # Fetch event from Google Calendar
            try:
                evt = await self.calendar.get_event(user_id=user_id, event_id=google_event_id)
            except Exception as e:
                logger.error(
                    f"Failed to fetch Google Calendar event: {e}",
                    extra={"user_id": str(user_id), "google_event_id": google_event_id},
                    exc_info=True
                )
                raise CalendarSyncError(f"Failed to fetch Google Calendar event: {e}")
            
            # Extract event details
            start = evt.get("start", {})
            dt_raw = start.get("dateTime") or (start.get("date") + "T09:00:00Z")
            title = evt.get("summary") or "Calendar event"
            desc = evt.get("description") or ""
            
            # Extract Meet URL from multiple possible locations
            meet_url = evt.get("hangoutLink")
            if not meet_url:
                conference_data = evt.get("conferenceData", {}) or {}
                entry_points = conference_data.get("entryPoints", []) or []
                for ep in entry_points:
                    if ep.get("entryPointType") == "video" and ep.get("uri"):
                        meet_url = ep["uri"]
                        break
            
            logger.debug(
                f"Event details extracted: {title}",
                extra={
                    "google_event_id": google_event_id,
                    "title": title,
                    "has_meet_url": bool(meet_url)
                }
            )
            
            # Parse due date
            try:
                due = datetime.fromisoformat(dt_raw.replace("Z", "+00:00"))
            except ValueError as e:
                logger.error(
                    f"Invalid date format in Google event: {dt_raw}",
                    extra={"google_event_id": google_event_id}
                )
                raise ReminderValidationError(f"Invalid date format in Google event: {e}")
            
            # Create reminder (without creating new Google event)
            r = await self.create_reminder(
                user_id=user_id,
                title=title,
                description=desc,
                due_date=due,
                application_id=application_id,
                create_google_event=False,  # already exists
            )
            
            # Attach the google id & meet url
            try:
                r = self.reminders.set_google_fields(
                    user_id=user_id,
                    reminder_id=r.id,
                    google_event_id=google_event_id,
                    meet_url=meet_url
                )
                
                logger.info(
                    f"Google event imported successfully",
                    extra={
                        "reminder_id": str(r.id),
                        "google_event_id": google_event_id,
                        "user_id": str(user_id)
                    }
                )
            except Exception as e:
                logger.error(
                    f"Failed to set Google fields: {e}",
                    extra={"reminder_id": str(r.id), "google_event_id": google_event_id},
                    exc_info=True
                )
                # Continue - reminder is created, just not fully linked
            
            return r
            
        except (ReminderValidationError, CalendarSyncError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error importing Google event: {e}",
                extra={"user_id": str(user_id), "google_event_id": google_event_id},
                exc_info=True
            )
            raise ReminderServiceError(f"Failed to import Google event: {e}")

    async def update_reminder(
        self, *, user_id: UUID, reminder_id: UUID, patch: Dict, timezone_str: str = "UTC"
    ) -> ReminderDTO:
        """
        Update a reminder with optional Google Calendar sync.
        
        If reminder is linked to Google Calendar and title/description/due_date
        are updated, syncs changes to the calendar event.
        
        Args:
            user_id: User UUID
            reminder_id: Reminder UUID to update
            patch: Dictionary of fields to update
            timezone_str: Timezone for Google Calendar sync
        
        Returns:
            Updated ReminderDTO
        
        Raises:
            ReminderValidationError: If IDs invalid or patch contains invalid data
            ReminderNotFoundError: If reminder not found or access denied
            ReminderServiceError: If update fails
        
        Example:
            updated = await service.update_reminder(
                user_id=UUID("..."),
                reminder_id=UUID("..."),
                patch={"title": "Updated title", "due_date": new_date},
                timezone_str="America/New_York"
            )
        """
        try:
            # Validate inputs
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            if not reminder_id or not isinstance(reminder_id, UUID):
                raise ReminderValidationError("reminder_id must be a valid UUID")
            
            if not patch or not isinstance(patch, dict):
                raise ReminderValidationError("patch must be a non-empty dictionary")
            
            # Validate patch fields
            if "title" in patch:
                title = patch["title"]
                if not title or not isinstance(title, str):
                    raise ReminderValidationError("title must be a non-empty string")
                if len(title.strip()) > MAX_TITLE_LENGTH:
                    raise ReminderValidationError(
                        f"Title too long. Maximum {MAX_TITLE_LENGTH} characters"
                    )
            
            if "description" in patch and patch["description"]:
                if len(patch["description"]) > MAX_DESCRIPTION_LENGTH:
                    raise ReminderValidationError(
                        f"Description too long. Maximum {MAX_DESCRIPTION_LENGTH} characters"
                    )
            
            logger.debug(
                f"Updating reminder",
                extra={
                    "reminder_id": str(reminder_id),
                    "user_id": str(user_id),
                    "patch_keys": list(patch.keys())
                }
            )
            
            # Get existing reminder (validates ownership)
            try:
                r = self.reminders.get_owned(user_id=user_id, reminder_id=reminder_id)
            except Exception as e:
                logger.warning(
                    f"Reminder not found or access denied: {e}",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)}
                )
                raise ReminderNotFoundError(f"Reminder {reminder_id} not found or access denied")
            
            # Update reminder in database
            try:
                r2 = self.reminders.update(user_id=user_id, reminder_id=reminder_id, data=patch)
                logger.debug(f"Reminder updated in database", extra={"reminder_id": str(reminder_id)})
            except Exception as e:
                logger.error(
                    f"Failed to update reminder: {e}",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)},
                    exc_info=True
                )
                raise ReminderServiceError(f"Failed to update reminder: {e}")
            
            # Sync to Google Calendar if linked and relevant fields changed
            if r2.google_event_id:
                body_changed = any(k in patch for k in ("title", "description", "due_date"))
                if body_changed:
                    try:
                        await self.calendar.update_event(
                            user_id=user_id,
                            event_id=r2.google_event_id,
                            title=patch.get("title"),
                            description=patch.get("description"),
                            start=patch.get("due_date"),
                            end=(patch.get("due_date") + timedelta(minutes=DEFAULT_REMINDER_DURATION_MINUTES))
                                if patch.get("due_date") else None,
                            timezone_str=timezone_str,
                        )
                        logger.info(
                            f"Google Calendar event synced",
                            extra={"reminder_id": str(reminder_id), "google_event_id": r2.google_event_id}
                        )
                    except Exception as e:
                        logger.error(
                            f"Failed to sync to Google Calendar: {e}",
                            extra={"reminder_id": str(reminder_id), "google_event_id": r2.google_event_id},
                            exc_info=True
                        )
                        # Non-fatal: reminder is updated, just not synced
                        logger.warning(f"Reminder updated without Google Calendar sync")
            
            logger.info(
                f"Reminder updated successfully",
                extra={
                    "reminder_id": str(reminder_id),
                    "user_id": str(user_id),
                    "google_synced": bool(r2.google_event_id and body_changed)
                }
            )
            
            return r2
            
        except (ReminderValidationError, ReminderNotFoundError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error updating reminder: {e}",
                extra={"reminder_id": str(reminder_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise ReminderServiceError(f"Failed to update reminder: {e}")

    async def list_reminders(self, *, user_id: UUID, skip: int, limit: int) -> List[ReminderDTO]:
        """
        List reminders for a user with pagination.
        
        Args:
            user_id: User UUID
            skip: Number of reminders to skip (for pagination)
            limit: Maximum number of reminders to return (max 1000)
        
        Returns:
            List of ReminderDTO objects
        
        Raises:
            ReminderValidationError: If user_id invalid or limit out of range
            ReminderServiceError: If list operation fails
        
        Example:
            reminders = await service.list_reminders(
                user_id=UUID("..."),
                skip=0,
                limit=50
            )
        """
        try:
            # Validate inputs
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            if skip < 0:
                raise ReminderValidationError(f"skip must be >= 0, got {skip}")
            
            if limit < 1:
                raise ReminderValidationError(f"limit must be >= 1, got {limit}")
            
            if limit > MAX_LIST_LIMIT:
                logger.warning(
                    f"Large limit requested: {limit}",
                    extra={"user_id": str(user_id), "limit": limit}
                )
                raise ReminderValidationError(
                    f"limit cannot exceed {MAX_LIST_LIMIT}, got {limit}"
                )
            
            logger.debug(
                f"Listing reminders",
                extra={"user_id": str(user_id), "skip": skip, "limit": limit}
            )
            
            try:
                reminders = self.reminders.list_for_user(user_id=user_id, skip=skip, limit=limit)
                
                logger.info(
                    f"Listed {len(reminders)} reminders",
                    extra={"user_id": str(user_id), "count": len(reminders)}
                )
                
                return reminders
                
            except Exception as e:
                logger.error(
                    f"Failed to list reminders: {e}",
                    extra={"user_id": str(user_id)},
                    exc_info=True
                )
                raise ReminderServiceError(f"Failed to list reminders: {e}")
            
        except (ReminderValidationError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error listing reminders: {e}",
                extra={"user_id": str(user_id)},
                exc_info=True
            )
            raise ReminderServiceError(f"Failed to list reminders: {e}")

    async def delete_reminder(self, *, user_id: UUID, reminder_id: UUID) -> None:
        """
        Delete a reminder with cascade cleanup.
        
        Deletes associated notes, optionally deletes Google Calendar event,
        then deletes the reminder. Google Calendar deletion is non-fatal.
        
        Args:
            user_id: User UUID
            reminder_id: Reminder UUID to delete
        
        Raises:
            ReminderValidationError: If IDs invalid
            ReminderNotFoundError: If reminder not found or access denied
            ReminderServiceError: If deletion fails
        
        Example:
            await service.delete_reminder(
                user_id=UUID("..."),
                reminder_id=UUID("...")
            )
        """
        try:
            # Validate inputs
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            if not reminder_id or not isinstance(reminder_id, UUID):
                raise ReminderValidationError("reminder_id must be a valid UUID")
            
            logger.debug(
                f"Deleting reminder",
                extra={"reminder_id": str(reminder_id), "user_id": str(user_id)}
            )
            
            # Get reminder (validates ownership)
            try:
                r = self.reminders.get_owned(user_id=user_id, reminder_id=reminder_id)
            except Exception as e:
                logger.warning(
                    f"Reminder not found or access denied: {e}",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)}
                )
                raise ReminderNotFoundError(f"Reminder {reminder_id} not found or access denied")
            
            # Delete Google Calendar event if exists (non-fatal)
            if r.google_event_id:
                try:
                    await self.calendar.delete_event(user_id=user_id, event_id=r.google_event_id)
                    logger.info(
                        f"Google Calendar event deleted",
                        extra={"reminder_id": str(reminder_id), "google_event_id": r.google_event_id}
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to delete Google Calendar event (non-fatal): {e}",
                        extra={"reminder_id": str(reminder_id), "google_event_id": r.google_event_id}
                    )
                    # Continue - reminder will still be deleted
            
            # Cascade delete notes
            try:
                self.notes.delete_all_for_reminder(reminder_id=reminder_id)
                logger.debug(f"Notes deleted for reminder", extra={"reminder_id": str(reminder_id)})
            except Exception as e:
                logger.warning(
                    f"Failed to delete notes (non-fatal): {e}",
                    extra={"reminder_id": str(reminder_id)}
                )
                # Continue - reminder will still be deleted
            
            # Delete reminder
            try:
                self.reminders.delete_owned(user_id=user_id, reminder_id=reminder_id)
                logger.info(
                    f"Reminder deleted successfully",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)}
                )
            except Exception as e:
                logger.error(
                    f"Failed to delete reminder: {e}",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)},
                    exc_info=True
                )
                raise ReminderServiceError(f"Failed to delete reminder: {e}")
            
        except (ReminderValidationError, ReminderNotFoundError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error deleting reminder: {e}",
                extra={"reminder_id": str(reminder_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise ReminderServiceError(f"Failed to delete reminder: {e}")

    # -------- Notes --------
    
    def list_notes(self, *, user_id: UUID, reminder_id: UUID) -> List[ReminderNoteDTO]:
        """
        List all notes for a reminder.
        
        Args:
            user_id: User UUID
            reminder_id: Reminder UUID
        
        Returns:
            List of ReminderNoteDTO objects
        
        Raises:
            NoteValidationError: If IDs invalid
            ReminderServiceError: If list operation fails
        
        Example:
            notes = service.list_notes(
                user_id=UUID("..."),
                reminder_id=UUID("...")
            )
        """
        try:
            if not user_id or not isinstance(user_id, UUID):
                raise NoteValidationError("user_id must be a valid UUID")
            
            if not reminder_id or not isinstance(reminder_id, UUID):
                raise NoteValidationError("reminder_id must be a valid UUID")
            
            logger.debug(
                f"Listing notes for reminder",
                extra={"reminder_id": str(reminder_id), "user_id": str(user_id)}
            )
            
            try:
                notes = self.notes.list_for_reminder(user_id=user_id, reminder_id=reminder_id)
                logger.info(
                    f"Listed {len(notes)} notes",
                    extra={"reminder_id": str(reminder_id), "count": len(notes)}
                )
                return notes
            except Exception as e:
                logger.error(
                    f"Failed to list notes: {e}",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)},
                    exc_info=True
                )
                raise ReminderServiceError(f"Failed to list notes: {e}")
                
        except (NoteValidationError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error listing notes: {e}", exc_info=True)
            raise ReminderServiceError(f"Failed to list notes: {e}")

    def create_note(self, *, user_id: UUID, reminder_id: UUID, body: str) -> ReminderNoteDTO:
        """
        Create a note for a reminder.
        
        Args:
            user_id: User UUID
            reminder_id: Reminder UUID
            body: Note content (max 10000 chars)
        
        Returns:
            Created ReminderNoteDTO
        
        Raises:
            NoteValidationError: If IDs invalid or body too long
            ReminderServiceError: If creation fails
        
        Example:
            note = service.create_note(
                user_id=UUID("..."),
                reminder_id=UUID("..."),
                body="Remember to bring portfolio"
            )
        """
        try:
            if not user_id or not isinstance(user_id, UUID):
                raise NoteValidationError("user_id must be a valid UUID")
            
            if not reminder_id or not isinstance(reminder_id, UUID):
                raise NoteValidationError("reminder_id must be a valid UUID")
            
            if not body or not isinstance(body, str):
                raise NoteValidationError("body must be a non-empty string")
            
            body = body.strip()
            if len(body) > MAX_BODY_LENGTH:
                logger.warning(
                    f"Note body too long: {len(body)} chars",
                    extra={"reminder_id": str(reminder_id), "body_length": len(body)}
                )
                raise NoteValidationError(
                    f"Note body too long. Maximum {MAX_BODY_LENGTH} characters, got {len(body)}"
                )
            
            logger.debug(
                f"Creating note for reminder",
                extra={"reminder_id": str(reminder_id), "user_id": str(user_id)}
            )
            
            try:
                note = self.notes.create(user_id=user_id, reminder_id=reminder_id, body=body)
                logger.info(
                    f"Note created successfully",
                    extra={"note_id": str(note.id), "reminder_id": str(reminder_id)}
                )
                return note
            except Exception as e:
                logger.error(
                    f"Failed to create note: {e}",
                    extra={"reminder_id": str(reminder_id), "user_id": str(user_id)},
                    exc_info=True
                )
                raise ReminderServiceError(f"Failed to create note: {e}")
                
        except (NoteValidationError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating note: {e}", exc_info=True)
            raise ReminderServiceError(f"Failed to create note: {e}")

    def update_note(self, *, user_id: UUID, note_id: UUID, body: str) -> ReminderNoteDTO:
        """
        Update a note's content.
        
        Args:
            user_id: User UUID
            note_id: Note UUID to update
            body: New note content (max 10000 chars)
        
        Returns:
            Updated ReminderNoteDTO
        
        Raises:
            NoteValidationError: If IDs invalid or body too long
            NoteNotFoundError: If note not found or access denied
            ReminderServiceError: If update fails
        
        Example:
            updated_note = service.update_note(
                user_id=UUID("..."),
                note_id=UUID("..."),
                body="Updated: Bring portfolio and references"
            )
        """
        try:
            if not user_id or not isinstance(user_id, UUID):
                raise NoteValidationError("user_id must be a valid UUID")
            
            if not note_id or not isinstance(note_id, UUID):
                raise NoteValidationError("note_id must be a valid UUID")
            
            if not body or not isinstance(body, str):
                raise NoteValidationError("body must be a non-empty string")
            
            body = body.strip()
            if len(body) > MAX_BODY_LENGTH:
                logger.warning(
                    f"Note body too long: {len(body)} chars",
                    extra={"note_id": str(note_id), "body_length": len(body)}
                )
                raise NoteValidationError(
                    f"Note body too long. Maximum {MAX_BODY_LENGTH} characters, got {len(body)}"
                )
            
            logger.debug(
                f"Updating note",
                extra={"note_id": str(note_id), "user_id": str(user_id)}
            )
            
            try:
                note = self.notes.update_owned(user_id=user_id, note_id=note_id, body=body)
                logger.info(
                    f"Note updated successfully",
                    extra={"note_id": str(note_id), "user_id": str(user_id)}
                )
                return note
            except Exception as e:
                logger.error(
                    f"Failed to update note: {e}",
                    extra={"note_id": str(note_id), "user_id": str(user_id)},
                    exc_info=True
                )
                # Check if it's a not found error
                if "not found" in str(e).lower() or "access denied" in str(e).lower():
                    raise NoteNotFoundError(f"Note {note_id} not found or access denied")
                raise ReminderServiceError(f"Failed to update note: {e}")
                
        except (NoteValidationError, NoteNotFoundError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error updating note: {e}", exc_info=True)
            raise ReminderServiceError(f"Failed to update note: {e}")

    def delete_note(self, *, user_id: UUID, note_id: UUID) -> None:
        """
        Delete a note.
        
        Args:
            user_id: User UUID
            note_id: Note UUID to delete
        
        Raises:
            NoteValidationError: If IDs invalid
            NoteNotFoundError: If note not found or access denied
            ReminderServiceError: If deletion fails
        
        Example:
            service.delete_note(
                user_id=UUID("..."),
                note_id=UUID("...")
            )
        """
        try:
            if not user_id or not isinstance(user_id, UUID):
                raise NoteValidationError("user_id must be a valid UUID")
            
            if not note_id or not isinstance(note_id, UUID):
                raise NoteValidationError("note_id must be a valid UUID")
            
            logger.debug(
                f"Deleting note",
                extra={"note_id": str(note_id), "user_id": str(user_id)}
            )
            
            try:
                self.notes.delete_owned(user_id=user_id, note_id=note_id)
                logger.info(
                    f"Note deleted successfully",
                    extra={"note_id": str(note_id), "user_id": str(user_id)}
                )
            except Exception as e:
                logger.error(
                    f"Failed to delete note: {e}",
                    extra={"note_id": str(note_id), "user_id": str(user_id)},
                    exc_info=True
                )
                # Check if it's a not found error
                if "not found" in str(e).lower() or "access denied" in str(e).lower():
                    raise NoteNotFoundError(f"Note {note_id} not found or access denied")
                raise ReminderServiceError(f"Failed to delete note: {e}")
                
        except (NoteValidationError, NoteNotFoundError, ReminderServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error deleting note: {e}", exc_info=True)
            raise ReminderServiceError(f"Failed to delete note: {e}")

    # -------- Google helpers (for endpoints that show connection / events) --------
    
    async def google_connected(self, *, user_id: UUID) -> bool:
        """
        Check if user has connected Google Calendar.
        
        Args:
            user_id: User UUID
        
        Returns:
            True if Google Calendar is connected, False otherwise
        
        Raises:
            ReminderValidationError: If user_id invalid
            ReminderServiceError: If check fails
        
        Example:
            is_connected = await service.google_connected(user_id=UUID("..."))
        """
        try:
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            logger.debug(f"Checking Google Calendar connection", extra={"user_id": str(user_id)})
            
            try:
                connected = await self.calendar.is_connected(user_id=user_id)
                logger.info(
                    f"Google Calendar connection status: {connected}",
                    extra={"user_id": str(user_id), "connected": connected}
                )
                return connected
            except Exception as e:
                logger.error(
                    f"Failed to check Google Calendar connection: {e}",
                    extra={"user_id": str(user_id)},
                    exc_info=True
                )
                # Return False instead of raising - user may not be connected
                return False
                
        except ReminderValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error checking Google connection: {e}", exc_info=True)
            return False

    async def list_google_events(
        self,
        *,
        user_id: UUID,
        time_min: Optional[str],
        time_max: Optional[str],
        max_results: int
    ) -> List[dict]:
        """
        List Google Calendar events for a user.
        
        Args:
            user_id: User UUID
            time_min: Optional minimum time (ISO 8601 format)
            time_max: Optional maximum time (ISO 8601 format)
            max_results: Maximum number of events to return (max 2500)
        
        Returns:
            List of Google Calendar event dictionaries
        
        Raises:
            ReminderValidationError: If user_id invalid or max_results out of range
            CalendarSyncError: If Google Calendar fetch fails
        
        Example:
            events = await service.list_google_events(
                user_id=UUID("..."),
                time_min="2024-01-01T00:00:00Z",
                time_max="2024-12-31T23:59:59Z",
                max_results=100
            )
        """
        try:
            if not user_id or not isinstance(user_id, UUID):
                raise ReminderValidationError("user_id must be a valid UUID")
            
            if max_results < 1:
                raise ReminderValidationError(f"max_results must be >= 1, got {max_results}")
            
            if max_results > MAX_GOOGLE_EVENTS:
                logger.warning(
                    f"Large max_results requested: {max_results}",
                    extra={"user_id": str(user_id), "max_results": max_results}
                )
                raise ReminderValidationError(
                    f"max_results cannot exceed {MAX_GOOGLE_EVENTS}, got {max_results}"
                )
            
            logger.debug(
                f"Listing Google Calendar events",
                extra={
                    "user_id": str(user_id),
                    "time_min": time_min,
                    "time_max": time_max,
                    "max_results": max_results
                }
            )
            
            try:
                events = await self.calendar.list_events(
                    user_id=user_id,
                    time_min=time_min,
                    time_max=time_max,
                    max_results=max_results
                )
                
                logger.info(
                    f"Listed {len(events)} Google Calendar events",
                    extra={"user_id": str(user_id), "count": len(events)}
                )
                
                return events
                
            except Exception as e:
                logger.error(
                    f"Failed to list Google Calendar events: {e}",
                    extra={"user_id": str(user_id)},
                    exc_info=True
                )
                raise CalendarSyncError(f"Failed to list Google Calendar events: {e}")
                
        except (ReminderValidationError, CalendarSyncError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error listing Google events: {e}", exc_info=True)
            raise ReminderServiceError(f"Failed to list Google events: {e}")

    # ==============================================================================
    # AI Preparation Tips (Pro/Premium Feature)
    # ==============================================================================

    async def _generate_and_send_ai_tips(
        self, *, reminder: ReminderDTO, user_id: UUID, application_id: UUID, event_type: Optional[str] = None
    ) -> None:
        """
        Generate AI-powered interview preparation tips and send email immediately.
        
        This is a Pro/Premium feature that:
        1. Fetches comprehensive application data (job, company, resume, attachments)
        2. Calls AI service to generate personalized preparation tips
        3. Caches the AI response in the database
        4. Sends an immediate email with the tips
        
        Args:
            reminder: The created reminder DTO
            user_id: User UUID
            application_id: Application UUID to fetch data for
            event_type: Optional event type for the reminder (e.g., "technical_interview")
        
        Note:
            This method is fire-and-forget. Failures are logged but don't block
            reminder creation. The user still gets their reminder even if AI tips fail.
        """
        try:
            # Validate services are available
            if not all([self.ai_prep_service, self.email_service, self.app_service]):
                logger.warning(
                    "AI prep tips requested but required services not available",
                    extra={
                        "reminder_id": str(reminder.id),
                        "has_ai_service": self.ai_prep_service is not None,
                        "has_email": self.email_service is not None,
                        "has_app_service": self.app_service is not None
                    }
                )
                return
            
            logger.info(
                f"Generating AI preparation tips for reminder",
                extra={
                    "reminder_id": str(reminder.id),
                    "user_id": str(user_id),
                    "application_id": str(application_id),
                    "event_type": event_type
                }
            )
            
            # Fetch comprehensive application data
            try:
                # get_detail returns a tuple: (app, job, company_name, company_website, resume_label, stages, notes, attachments)
                (
                    app_dto, job_dto, company_name, company_website,
                    resume_label, stages, notes, attachments
                ) = self.app_service.get_detail(
                    user_id=user_id, 
                    app_id=application_id
                )
                
                if not job_dto:
                    logger.warning(
                        f"Application has no job data, skipping AI tips",
                        extra={
                            "reminder_id": str(reminder.id),
                            "application_id": str(application_id)
                        }
                    )
                    return
                
                # Extract job details from JobTinyDTO
                company_name = job_dto.company_name or ""
                job_title = job_dto.title or ""
                job_description = job_dto.description or ""
                job_url = job_dto.source_url or ""
                
                # Get resume text if available
                resume_text = None
                if app_dto.resume_id:
                    from app.db.models import Resume
                    from app.db.session import SessionLocal
                    db = SessionLocal()
                    try:
                        resume = db.get(Resume, app_dto.resume_id)
                        if resume and resume.text:
                            resume_text = resume.text
                    finally:
                        db.close()
                
                # Get cover letter text if available
                cover_letter_text = None
                for att in attachments:
                    if att.document_type == "cover_letter":
                        # Try to get extracted text from attachment
                        # Note: attachments might not have extracted_text field
                        # This would need to be fetched from the file system if needed
                        break
                
                logger.debug(
                    f"Fetched application data for AI generation",
                    extra={
                        "reminder_id": str(reminder.id),
                        "has_job": bool(job_dto),
                        "has_resume": bool(resume_text),
                        "has_cover_letter": bool(cover_letter_text),
                        "company": company_name,
                        "role": job_title
                    }
                )
                
            except Exception as e:
                logger.error(
                    f"Failed to fetch application data: {e}",
                    extra={
                        "reminder_id": str(reminder.id),
                        "application_id": str(application_id)
                    },
                    exc_info=True
                )
                return
            
            # Generate AI tips
            try:
                # AIPreparationService.generate_preparation_tips expects
                # job_requirements, job_skills, event_title and event_description
                # (and does NOT accept job_url). Provide sensible defaults from
                # JobTinyDTO and reminder data.
                job_requirements = getattr(job_dto, "requirements", []) or []
                job_skills = getattr(job_dto, "skills", []) or []

                result = await self.ai_prep_service.generate_preparation_tips(
                    job_title=job_title,
                    company_name=company_name,
                    job_description=job_description,
                    job_requirements=job_requirements,
                    job_skills=job_skills,
                    event_type=event_type or "general",
                    event_title=getattr(reminder, "title", "") or "",
                    event_description=getattr(reminder, "notes", None),
                    event_date=reminder.due_date,
                    resume_text=resume_text,
                    cover_letter_text=cover_letter_text,
                    additional_documents=None
                )

                if not result or not result.get("success"):
                    logger.warning(
                        f"AI service returned failure: {result.get('error', 'Unknown error') if result else 'No result'}",
                        extra={
                            "reminder_id": str(reminder.id),
                            "error": (result.get("error") if result else None)
                        }
                    )
                    return

                # The AI service returns a dict containing tips/insights etc.
                ai_response = result
                logger.info(
                    f"AI tips generated successfully",
                    extra={
                        "reminder_id": str(reminder.id),
                        "has_tips": bool(ai_response)
                    }
                )
                
            except Exception as e:
                logger.error(
                    f"Failed to generate AI tips: {e}",
                    extra={"reminder_id": str(reminder.id)},
                    exc_info=True
                )
                return
            
            # Cache AI response in database
            try:
                import json
                from datetime import datetime as dt
                self.reminders.update(
                    user_id=user_id,
                    reminder_id=reminder.id,
                    data={
                        "ai_prep_tips_generated": json.dumps(ai_response),
                        "ai_prep_tips_generated_at": dt.now(timezone.utc)
                    }
                )
                logger.debug(
                    f"AI tips cached in database",
                    extra={"reminder_id": str(reminder.id)}
                )
            except Exception as e:
                logger.warning(
                    f"Failed to cache AI tips in database: {e}",
                    extra={"reminder_id": str(reminder.id)},
                    exc_info=True
                )
                # Continue with email even if caching fails
            
            # Format tips for email
            try:
                ai_tips_html = self.ai_prep_service.format_tips_for_email(ai_response)
            except Exception as e:
                logger.error(
                    f"Failed to format AI tips for email: {e}",
                    extra={"reminder_id": str(reminder.id)},
                    exc_info=True
                )
                return
            
            # Send immediate email with AI tips
            try:
                # Get user info for email
                from app.db.models import User
                from app.db.session import SessionLocal
                db = SessionLocal()
                try:
                    user = db.get(User, user_id)
                    if not user:
                        logger.warning(
                            f"User not found for AI tips email",
                            extra={"user_id": str(user_id), "reminder_id": str(reminder.id)}
                        )
                        return
                    
                    user_email = user.email
                    user_name = user.full_name or user.email.split('@')[0]
                finally:
                    db.close()
                
                # Format due date for email
                from datetime import timezone as tz
                due_date_utc = reminder.due_date
                user_timezone_str = getattr(reminder, 'user_timezone', 'UTC') or 'UTC'
                
                try:
                    from zoneinfo import ZoneInfo
                    user_tz = ZoneInfo(user_timezone_str)
                    due_date_local = due_date_utc.replace(tzinfo=tz.utc).astimezone(user_tz)
                    due_date_str = due_date_local.strftime('%B %d, %Y at %I:%M %p')
                except Exception as e:
                    logger.warning(f"Failed to convert timezone: {e}")
                    due_date_str = due_date_utc.strftime('%B %d, %Y at %I:%M %p UTC')
                
                # Calculate time until and urgency
                from datetime import datetime
                now = datetime.now(tz.utc)
                time_diff = (due_date_utc - now).total_seconds()
                hours_until = time_diff / 3600
                
                if hours_until < 0:
                    time_until_str = "overdue"
                    urgency = "now"
                elif hours_until < 1:
                    time_until_str = f"{int(time_diff / 60)} minutes"
                    urgency = "now"
                elif hours_until < 24:
                    time_until_str = f"{int(hours_until)} hours"
                    urgency = "today"
                elif hours_until < 48:
                    time_until_str = "tomorrow"
                    urgency = "tomorrow"
                elif hours_until < 168:  # 7 days
                    time_until_str = f"{int(hours_until / 24)} days"
                    urgency = "week"
                else:
                    time_until_str = f"{int(hours_until / 24)} days"
                    urgency = "future"
                
                # Build action URL
                from app.config import settings
                if reminder.application_id:
                    action_url = f"{settings.FRONTEND_URL}/pipeline?highlight={reminder.application_id}"
                else:
                    action_url = f"{settings.FRONTEND_URL}/reminders"
                
                # Send email (note: send_reminder_email is sync, not async)
                success = self.email_service.send_reminder_email(
                    to_email=user_email,
                    name=user_name,
                    title=reminder.title,
                    description=reminder.description or "",
                    due_date=due_date_str,
                    time_until=time_until_str,
                    urgency=urgency,
                    event_type=event_type or "general",
                    action_url=action_url,
                    ai_prep_tips_html=ai_tips_html
                )
                
                if success:
                    logger.info(
                        f"AI preparation tips email sent successfully",
                        extra={
                            "reminder_id": str(reminder.id),
                            "user_id": str(user_id),
                            "company": company_name,
                            "role": job_title,
                            "event_type": event_type,
                            "to_email": user_email
                        }
                    )
                else:
                    logger.warning(
                        f"AI tips email failed to send",
                        extra={"reminder_id": str(reminder.id), "user_id": str(user_id)}
                    )
                
            except Exception as e:
                logger.error(
                    f"Failed to send AI tips email: {e}",
                    extra={
                        "reminder_id": str(reminder.id),
                        "user_id": str(user_id)
                    },
                    exc_info=True
                )
                # Email failure is logged but doesn't fail the reminder creation
                
        except Exception as e:
            # Catch-all to ensure AI feature never crashes reminder creation
            logger.error(
                f"Unexpected error in AI tips generation: {e}",
                extra={
                    "reminder_id": str(reminder.id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
