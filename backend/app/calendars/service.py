from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import uuid


import requests
from sqlalchemy.orm import Session

from app.db import models
from app.auth.oauth.google import get_valid_google_token


class CalendarException(Exception):
    pass

async def create_google_calendar_event(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    description: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    *,
    timezone_str: str = "UTC",
    calendar_id: str = "primary",
    add_meet_link: bool = False,
    private_props: Optional[dict] = None,
) -> str:
    access_token = await get_valid_google_token(db, user_id)
    if not access_token:
        raise CalendarException("Google Calendar not connected")

    # Sensible defaults
    if not start_time:
        start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    if not end_time:
        end_time = start_time + timedelta(minutes=30)

    event = {
        "summary": title,
        "description": description or "",
        "start": {"dateTime": start_time.isoformat(), "timeZone": timezone_str},
        "end": {"dateTime": end_time.isoformat(), "timeZone": timezone_str},
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 24 * 60},
                {"method": "popup", "minutes": 30},
            ],
        },
    }

    if private_props:
        event["extendedProperties"] = {"private": private_props}

    params = {}
    if add_meet_link:
        event["conferenceData"] = {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        }
        params["conferenceDataVersion"] = "1"

    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
    r = requests.post(url, headers=headers, params=params, json=event, timeout=10)
    if r.status_code not in (200, 201):
        raise CalendarException(f"Failed to create calendar event: {r.text}")

    data = r.json()
    meet_url = data.get("hangoutLink")
    if not meet_url:
        entry_points = data.get("conferenceData", {}).get("entryPoints", [])
        for ep in entry_points or []:
            if ep.get("entryPointType") == "video" and ep.get("uri"):
                meet_url = ep["uri"]; break
    return data.get("id"), meet_url

def list_reminder_notes(db: Session, user_id: uuid.UUID, reminder_id: uuid.UUID):
    return db.query(models.ReminderNote).filter(
        models.ReminderNote.user_id == user_id,
        models.ReminderNote.reminder_id == reminder_id,
    ).order_by(models.ReminderNote.created_at.asc()).all()

def create_reminder_note(db: Session, user_id: uuid.UUID, reminder_id: uuid.UUID, body: str):
    note = models.ReminderNote(user_id=user_id, reminder_id=reminder_id, body=body)
    db.add(note); db.commit(); db.refresh(note); return note

def update_reminder_note(db: Session, user_id: uuid.UUID, note_id: uuid.UUID, body: str):
    note = db.query(models.ReminderNote).filter(
        models.ReminderNote.id == note_id,
        models.ReminderNote.user_id == user_id,
    ).first()
    if not note: raise CalendarException("Note not found")
    note.body = body; 
    note.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(note); return note

def delete_reminder_note(db: Session, user_id: uuid.UUID, note_id: uuid.UUID):
    note = db.query(models.ReminderNote).filter(
        models.ReminderNote.id == note_id,
        models.ReminderNote.user_id == user_id,
    ).first()
    if not note: return
    db.delete(note); db.commit()


async def update_reminder(
    db: Session,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    **fields,
) -> models.Reminder:
    r = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id,
        models.Reminder.user_id == user_id,
    ).first()
    if not r:
        raise CalendarException("Reminder not found")

    for k in ("title","description","due_date","application_id","google_event_id","meet_url"):
        if k in fields and fields[k] is not None:
            setattr(r, k, fields[k])

    r.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(r)
    return r

async def create_reminder_with_calendar(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    description: str | None,
    due_date: datetime | None,
    application_id: uuid.UUID | None,
    *,
    create_google_event: bool = True,
    add_meet_link: bool = False,
    calendar_id: str = "primary",
    timezone_str: str = "UTC",
) -> models.Reminder:
    if not due_date:
        due_date = datetime.now(timezone.utc) + timedelta(hours=1)

    existing = db.query(models.Reminder).filter(
        models.Reminder.user_id == user_id,
        models.Reminder.title == title,
        models.Reminder.application_id == application_id,
        models.Reminder.due_date.between(due_date - timedelta(minutes=2), due_date + timedelta(minutes=2)),
    ).first()
    if existing:
        return existing

    reminder = models.Reminder(
        user_id=user_id,
        application_id=application_id,
        title=title,
        description=description,
        due_date=due_date,
    )
    db.add(reminder)
    db.flush()  # get reminder.id

    event_id, meet_url = await create_google_calendar_event(
        db=db,
        user_id=user_id,
        title=title,
        description=description,
        start_time=due_date,
        end_time=due_date + timedelta(minutes=30),
        calendar_id=calendar_id,
        add_meet_link=add_meet_link,
        timezone_str=timezone_str,
        private_props={
            "applytide": "1",
            "reminder_id": str(reminder.id),
            "application_id": str(application_id or ""),
        },
    )

    if event_id:
        reminder.google_event_id = event_id
    if meet_url:
        reminder.meet_url = meet_url


    db.commit()
    db.refresh(reminder)
    return reminder


async def get_user_reminders(
    db: Session,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100
) -> List[models.Reminder]:
    """
    Get a user's reminders
    """
    return db.query(models.Reminder).filter(
        models.Reminder.user_id == user_id
    ).order_by(
        models.Reminder.due_date.asc()
    ).offset(skip).limit(limit).all()

async def delete_reminder_and_google_event(
    db: Session,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
) -> None:
    # fetch reminder (ensuring it belongs to user)
    reminder = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id,
        models.Reminder.user_id == user_id,
    ).first()

    if not reminder:
        raise CalendarException("Reminder not found or doesn't belong to user")

    # try to delete Google event if present
    if reminder.google_event_id:
        try:
            access_token = await get_valid_google_token(db, user_id)
            if access_token:
                headers = {"Authorization": f"Bearer {access_token}"}
                requests.delete(
                    f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{reminder.google_event_id}",
                    headers=headers,
                    timeout=10
                )
        except Exception as e:
            # Log but continue - we still want to delete the local reminder
            print(f"Failed to delete Google Calendar event: {e}")

    # First delete any associated reminder notes
    db.query(models.ReminderNote).filter(
        models.ReminderNote.reminder_id == reminder_id
    ).delete()
    
    # Then delete the local reminder
    db.delete(reminder)
    db.commit()
