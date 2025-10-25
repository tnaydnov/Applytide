from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from ..deps_auth import get_current_user
from ...api.schemas.auth import UserInfo as User
from ...domain.reminders.service import ReminderService
from ..deps import get_reminder_service
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/calendars", tags=["calendars"])
logger = get_logger(__name__)

# ---------- Schemas (kept compatible with your existing ones) ----------
class ReminderNoteCreate(BaseModel):
    body: str

class ReminderNoteOut(BaseModel):
    id: uuid.UUID
    reminder_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime
    application_id: Optional[uuid.UUID] = None
    add_meet_link: bool = False
    create_google_event: bool = True
    timezone_str: str = "UTC"
    # Email notification fields
    email_notifications_enabled: bool = False
    notification_schedule: Optional[dict] = None
    event_type: Optional[str] = "general"
    user_timezone: Optional[str] = "UTC"  # User's timezone for proper time display

class ReminderResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    due_date: datetime
    application_id: Optional[uuid.UUID] = None
    google_event_id: Optional[str] = None
    meet_url: Optional[str] = None
    created_at: datetime
    # Email notification fields
    email_notifications_enabled: bool = False
    notification_schedule: Optional[dict] = None
    event_type: Optional[str] = "general"
    last_notification_sent: Optional[datetime] = None
    user_timezone: Optional[str] = "UTC"
    class Config: from_attributes = True

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    application_id: Optional[uuid.UUID] = None
    google_event_id: Optional[str] = None
    meet_url: Optional[str] = None
    timezone_str: Optional[str] = "UTC"
    # Email notification fields
    email_notifications_enabled: Optional[bool] = None
    notification_schedule: Optional[dict] = None
    event_type: Optional[str] = None

# ---------- Notes ----------
@router.get("/reminders/{reminder_id}/notes", response_model=List[ReminderNoteOut])
def list_notes(reminder_id: uuid.UUID, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    return svc.list_notes(user_id=user.id, reminder_id=reminder_id)

@router.post("/reminders/{reminder_id}/notes", response_model=ReminderNoteOut)
def create_note(reminder_id: uuid.UUID, payload: ReminderNoteCreate, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    return svc.create_note(user_id=user.id, reminder_id=reminder_id, body=payload.body)

@router.put("/reminder-notes/{note_id}", response_model=ReminderNoteOut)
def update_note(note_id: uuid.UUID, payload: ReminderNoteCreate, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    return svc.update_note(user_id=user.id, note_id=note_id, body=payload.body)

@router.delete("/reminder-notes/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    svc.delete_note(user_id=user.id, note_id=note_id); return

# ---------- Google helpers ----------
@router.get("/google/check-connection", response_model=dict)
async def check_google_connection(user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    return {"connected": await svc.google_connected(user_id=user.id)}

@router.get("/google/events")
async def get_google_calendar_events(
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    max_results: int = 100,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    try:
        return await svc.list_google_events(user_id=user.id, time_min=time_min, time_max=time_max, max_results=max_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reminders/import-google-event", response_model=ReminderResponse)
async def import_google_event(
    google_event_id: str = Body(..., embed=True),
    application_id: uuid.UUID | None = Body(None, embed=True),
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    try:
        return await svc.import_from_google_event(user_id=user.id, google_event_id=google_event_id, application_id=application_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Reminders ----------
@router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(reminder: ReminderCreate, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    try:
        logger.info(
            "Creating reminder with email notifications",
            extra={
                "user_id": str(user.id),
                "email_enabled": reminder.email_notifications_enabled,
                "event_type": reminder.event_type,
                "has_schedule": reminder.notification_schedule is not None
            }
        )
        return await svc.create_reminder(
            user_id=user.id,
            title=reminder.title,
            description=reminder.description,
            due_date=reminder.due_date,
            application_id=reminder.application_id,
            create_google_event=reminder.create_google_event,
            add_meet_link=reminder.add_meet_link,
            calendar_id="primary",
            timezone_str=reminder.timezone_str,
            # Email notification fields
            email_notifications_enabled=reminder.email_notifications_enabled,
            notification_schedule=reminder.notification_schedule,
            event_type=reminder.event_type,
            user_timezone=reminder.user_timezone,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(skip: int = 0, limit: int = 100, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    return await svc.list_reminders(user_id=user.id, skip=skip, limit=limit)

@router.patch("/reminders/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: uuid.UUID,
    patch: ReminderUpdate,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    data = patch.model_dump(exclude_none=True)
    tz = data.pop("timezone_str", "UTC")
    return await svc.update_reminder(user_id=user.id, reminder_id=reminder_id, patch=data, timezone_str=tz)

@router.delete("/reminders/{reminder_id}", status_code=204)
async def delete_reminder(reminder_id: uuid.UUID, user: User = Depends(get_current_user), svc: ReminderService = Depends(get_reminder_service)):
    await svc.delete_reminder(user_id=user.id, reminder_id=reminder_id); return
