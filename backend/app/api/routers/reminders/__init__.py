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

# Create main reminders router
router = APIRouter()

# Include all sub-routers
router.include_router(notes_router, tags=["reminders"])
router.include_router(google_router, tags=["reminders"])
router.include_router(crud_router, tags=["reminders"])

# Export router and schemas for main app
__all__ = [
    "router",
    "ReminderBase",
    "ReminderCreate",
    "ReminderUpdate",
    "ReminderResponse",
    "ReminderNoteCreate",
    "ReminderNoteUpdate",
    "ReminderNoteOut",
]
