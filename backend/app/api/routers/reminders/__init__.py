"""
Reminders API Router Package

Aggregates all reminder-related API endpoints into a single router.
Organized into functional modules for better maintainability:
- notes: Reminder notes CRUD (list, create, update, delete)
- google: Google Calendar integration (connection check, events, import)
- crud: Reminder CRUD operations (create, read, update, delete)
"""
from fastapi import APIRouter

from .notes import router as notes_router
from .google import router as google_router
from .crud import router as crud_router
from .schemas import (
    ReminderBase,
    ReminderCreate,
    ReminderUpdate,
    ReminderResponse,
    ReminderNoteCreate,
    ReminderNoteUpdate,
    ReminderNoteOut,
)

# Create main reminders router with prefix
router = APIRouter(prefix="/api/calendars/reminders", tags=["reminders"])

# Include reminder-specific sub-routers
router.include_router(notes_router)
router.include_router(crud_router)

# Create separate Google Calendar router (not under /reminders)
google_calendar_router = APIRouter(prefix="/api/calendars", tags=["google-calendar"])
google_calendar_router.include_router(google_router)

# Export routers and schemas for main app
__all__ = [
    "router",
    "google_calendar_router",
    "ReminderBase",
    "ReminderCreate",
    "ReminderUpdate",
    "ReminderResponse",
    "ReminderNoteCreate",
    "ReminderNoteUpdate",
    "ReminderNoteOut",
]
