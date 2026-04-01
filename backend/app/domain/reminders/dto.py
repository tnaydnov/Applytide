"""
Reminders domain Data Transfer Objects (DTOs).

This module defines data structures for transferring reminder data between
layers of the application. DTOs are used to:
- Transfer reminder data from repositories to services
- Transfer reminder data from services to API layers
- Structure reminder and note information

Classes:
- ReminderDTO: Complete reminder information with calendar integration
- ReminderNoteDTO: Notes attached to reminders
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)

# Configuration constants
MAX_TITLE_LENGTH: int = 500  # Maximum reminder title length
MAX_DESCRIPTION_LENGTH: int = 10000  # Maximum description length
MAX_GOOGLE_EVENT_ID_LENGTH: int = 200  # Maximum Google event ID length
MAX_MEET_URL_LENGTH: int = 500  # Maximum meet URL length
MAX_NOTE_BODY_LENGTH: int = 50000  # Maximum note body length


@dataclass
class ReminderDTO:
    """
    Complete reminder information with calendar integration.
    
    This DTO represents a reminder/calendar event with optional Google
    Calendar integration and application linking.
    
    Attributes:
        id: Unique reminder identifier (UUID)
        user_id: UUID of user who created reminder
        title: Reminder title/summary
        description: Optional detailed description
        due_date: When reminder is due/scheduled
        application_id: Optional UUID of linked job application
        google_event_id: Optional Google Calendar event ID
        meet_url: Optional Google Meet video conference URL
        created_at: Timestamp when reminder was created
        updated_at: Timestamp when reminder was last updated
    
    Validation:
        - id, user_id must be valid UUIDs
        - application_id can be None
        - title must not be empty
        - due_date, created_at, updated_at must be valid datetimes
    
    Examples:
        >>> reminder = ReminderDTO(
        ...     id=uuid4(),
        ...     user_id=uuid4(),
        ...     title="Technical Interview - TechCorp",
        ...     description="Prepare algorithms and system design",
        ...     due_date=datetime(2024, 1, 15, 10, 0),
        ...     application_id=uuid4(),
        ...     google_event_id="abc123xyz",
        ...     meet_url="https://meet.google.com/xyz-abc",
        ...     created_at=datetime.now(),
        ...     updated_at=datetime.now()
        ... )
    """
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    due_date: datetime
    application_id: Optional[UUID]
    google_event_id: Optional[str]
    meet_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    event_type: Optional[str] = "general"
    email_notifications_enabled: bool = False
    notification_schedule: Optional[Dict[str, Any]] = None
    ai_prep_tips_enabled: bool = False
    ai_prep_tips_generated: Optional[str] = None
    ai_prep_tips_generated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """
        Validate DTO fields after initialization.
        
        Raises:
            ValueError: If validation fails for any field
        """
        try:
            # Validate UUID fields
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.user_id, UUID):
                raise ValueError(f"user_id must be UUID, got {type(self.user_id).__name__}")
            
            if self.application_id is not None and not isinstance(self.application_id, UUID):
                raise ValueError(f"application_id must be UUID or None, got {type(self.application_id).__name__}")
            
            # Validate title
            if not self.title or not self.title.strip():
                raise ValueError("title must not be empty")
            
            if len(self.title) > MAX_TITLE_LENGTH:
                logger.warning(
                    "Reminder title exceeds maximum length",
                    extra={
                        "reminder_id": str(self.id),
                        "title_length": len(self.title),
                        "max_length": MAX_TITLE_LENGTH
                    }
                )
                self.title = self.title[:MAX_TITLE_LENGTH]
            
            # Validate description
            if self.description and len(self.description) > MAX_DESCRIPTION_LENGTH:
                logger.warning(
                    "Reminder description exceeds maximum length",
                    extra={
                        "reminder_id": str(self.id),
                        "description_length": len(self.description),
                        "max_length": MAX_DESCRIPTION_LENGTH
                    }
                )
                self.description = self.description[:MAX_DESCRIPTION_LENGTH]
            
            # Validate google_event_id
            if self.google_event_id and len(self.google_event_id) > MAX_GOOGLE_EVENT_ID_LENGTH:
                logger.warning(
                    "Google event ID exceeds maximum length",
                    extra={
                        "reminder_id": str(self.id),
                        "event_id_length": len(self.google_event_id),
                        "max_length": MAX_GOOGLE_EVENT_ID_LENGTH
                    }
                )
                self.google_event_id = self.google_event_id[:MAX_GOOGLE_EVENT_ID_LENGTH]
            
            # Validate meet_url
            if self.meet_url and len(self.meet_url) > MAX_MEET_URL_LENGTH:
                logger.warning(
                    "Meet URL exceeds maximum length",
                    extra={
                        "reminder_id": str(self.id),
                        "meet_url_length": len(self.meet_url),
                        "max_length": MAX_MEET_URL_LENGTH
                    }
                )
                self.meet_url = self.meet_url[:MAX_MEET_URL_LENGTH]
            
            # Validate datetimes
            if not isinstance(self.due_date, datetime):
                raise ValueError(f"due_date must be datetime, got {type(self.due_date).__name__}")
            
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            if not isinstance(self.updated_at, datetime):
                raise ValueError(f"updated_at must be datetime, got {type(self.updated_at).__name__}")
            
            # Check if reminder is in the past (use timezone-aware comparison)
            now = datetime.now(timezone.utc)
            due_date_aware = self.due_date if self.due_date.tzinfo else self.due_date.replace(tzinfo=timezone.utc)
            if due_date_aware < now:
                logger.info(
                    "Reminder due date is in the past",
                    extra={
                        "reminder_id": str(self.id),
                        "due_date": self.due_date.isoformat(),
                        "title": self.title
                    }
                )
            
            logger.debug(
                "ReminderDTO validated successfully",
                extra={
                    "reminder_id": str(self.id),
                    "user_id": str(self.user_id),
                    "title": self.title,
                    "due_date": self.due_date.isoformat(),
                    "has_google_event": self.google_event_id is not None,
                    "has_application": self.application_id is not None
                }
            )
            
        except Exception as e:
            logger.error(
                "ReminderDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "reminder_id": str(self.id) if isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DTO to dictionary for JSON serialization.
        
        Returns:
            Dict[str, Any]: Dictionary representation of reminder data
        """
        try:
            return {
                'id': str(self.id),
                'user_id': str(self.user_id),
                'title': self.title,
                'description': self.description,
                'due_date': self.due_date.isoformat(),
                'application_id': str(self.application_id) if self.application_id else None,
                'google_event_id': self.google_event_id,
                'meet_url': self.meet_url,
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat()
            }
        except Exception as e:
            logger.error(
                "Error converting ReminderDTO to dict",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "reminder_id": str(self.id)
                },
                exc_info=True
            )
            raise
    
    def is_past_due(self) -> bool:
        """
        Check if reminder is past due.
        
        Returns:
            bool: True if due_date is in the past, False otherwise
        """
        is_past = self.due_date < datetime.now()
        
        if is_past:
            logger.debug(
                "Reminder is past due",
                extra={
                    "reminder_id": str(self.id),
                    "due_date": self.due_date.isoformat(),
                    "title": self.title
                }
            )
        
        return is_past


@dataclass
class ReminderNoteDTO:
    """
    Notes attached to reminders.
    
    This DTO represents a note/comment attached to a reminder for
    tracking additional information, follow-ups, or outcomes.
    
    Attributes:
        id: Unique note identifier (UUID)
        reminder_id: UUID of parent reminder
        user_id: UUID of user who created note
        body: Note content/text
        created_at: Timestamp when note was created
        updated_at: Timestamp when note was last updated
    
    Validation:
        - id, reminder_id, user_id must be valid UUIDs
        - body must not be empty
        - created_at, updated_at must be valid datetimes
    
    Examples:
        >>> note = ReminderNoteDTO(
        ...     id=uuid4(),
        ...     reminder_id=uuid4(),
        ...     user_id=uuid4(),
        ...     body="Interview went well! They asked about system design.",
        ...     created_at=datetime.now(),
        ...     updated_at=datetime.now()
        ... )
    """
    id: UUID
    reminder_id: UUID
    user_id: UUID
    body: str
    created_at: datetime
    updated_at: datetime
    
    def __post_init__(self):
        """
        Validate note DTO fields after initialization.
        
        Raises:
            ValueError: If validation fails for any field
        """
        try:
            # Validate UUID fields
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.reminder_id, UUID):
                raise ValueError(f"reminder_id must be UUID, got {type(self.reminder_id).__name__}")
            
            if not isinstance(self.user_id, UUID):
                raise ValueError(f"user_id must be UUID, got {type(self.user_id).__name__}")
            
            # Validate body
            if not self.body or not self.body.strip():
                raise ValueError("body must not be empty")
            
            if len(self.body) > MAX_NOTE_BODY_LENGTH:
                logger.warning(
                    "Reminder note body exceeds maximum length",
                    extra={
                        "note_id": str(self.id),
                        "body_length": len(self.body),
                        "max_length": MAX_NOTE_BODY_LENGTH
                    }
                )
                self.body = self.body[:MAX_NOTE_BODY_LENGTH]
            
            # Validate datetimes
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            if not isinstance(self.updated_at, datetime):
                raise ValueError(f"updated_at must be datetime, got {type(self.updated_at).__name__}")
            
            logger.debug(
                "ReminderNoteDTO validated successfully",
                extra={
                    "note_id": str(self.id),
                    "reminder_id": str(self.reminder_id),
                    "user_id": str(self.user_id),
                    "body_length": len(self.body)
                }
            )
            
        except Exception as e:
            logger.error(
                "ReminderNoteDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "note_id": str(self.id) if hasattr(self, 'id') and isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DTO to dictionary for JSON serialization.
        
        Returns:
            Dict[str, Any]: Dictionary representation of note data
        """
        try:
            return {
                'id': str(self.id),
                'reminder_id': str(self.reminder_id),
                'user_id': str(self.user_id),
                'body': self.body,
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat()
            }
        except Exception as e:
            logger.error(
                "Error converting ReminderNoteDTO to dict",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "note_id": str(self.id)
                },
                exc_info=True
            )
            raise


# Export all DTOs
__all__ = ['ReminderDTO', 'ReminderNoteDTO']
