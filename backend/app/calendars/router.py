from datetime import datetime, timedelta
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.db import models
from app.calendars import service
from app.auth.oauth.google import get_valid_google_token
from app.auth.schemas import UserInfo as User
import requests
from pydantic import BaseModel
from typing import Optional


# --- Notes schemas ---
class ReminderNoteCreate(BaseModel):
    body: str

class ReminderNoteOut(BaseModel):
    id: uuid.UUID
    reminder_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


class ReminderCreate(BaseModel):
    title: str
    description: str = None
    due_date: datetime
    application_id: uuid.UUID = None
    add_meet_link: bool = False
    create_google_event: bool = True
    timezone_str: str = "UTC"


class ReminderResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    due_date: datetime
    application_id: Optional[uuid.UUID] = None
    google_event_id: Optional[str] = None
    meet_url: Optional[str] = None           # <-- add
    created_at: datetime
    class Config:
        from_attributes = True



router = APIRouter(prefix="/calendars", tags=["calendars"])


@router.get("/reminders/{reminder_id}/notes", response_model=List[ReminderNoteOut])
def list_notes(reminder_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_reminder_notes(db, current_user.id, reminder_id)

@router.post("/reminders/{reminder_id}/notes", response_model=ReminderNoteOut)
def create_note(reminder_id: uuid.UUID, payload: ReminderNoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_reminder_note(db, current_user.id, reminder_id, payload.body)

@router.put("/reminder-notes/{note_id}", response_model=ReminderNoteOut)
def update_note(note_id: uuid.UUID, payload: ReminderNoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_reminder_note(db, current_user.id, note_id, payload.body)


@router.delete("/reminder-notes/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service.delete_reminder_note(db, current_user.id, note_id)
    return

@router.post("/reminders/import-google-event", response_model=ReminderResponse)
async def import_google_event(
    google_event_id: str = Body(..., embed=True),
    application_id: uuid.UUID | None = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    access_token = await get_valid_google_token(db, current_user.id)
    if not access_token:
        raise HTTPException(status_code=401, detail="Google Calendar not connected")
    
    already = db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id,
        models.Reminder.google_event_id == google_event_id,
    ).first()
    if already:
        return already

    headers = {"Authorization": f"Bearer {access_token}"}
    r = requests.get(
        f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_event_id}",
        headers=headers,
        timeout=10,
    )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    
    evt = r.json()
    start = evt.get("start", {})
    dt = start.get("dateTime") or (start.get("date") + "T09:00:00Z")
    title = evt.get("summary") or "Calendar event"
    desc = evt.get("description") or ""

    meet_url = evt.get("hangoutLink")
    if not meet_url:
        for ep in (evt.get("conferenceData", {}) or {}).get("entryPoints", []) or []:
            if ep.get("entryPointType") == "video" and ep.get("uri"):
                meet_url = ep["uri"]; break

    created = await service.create_reminder_with_calendar(
        db=db,
        user_id=current_user.id,
        title=title,
        description=desc,
        due_date=datetime.fromisoformat(dt.replace("Z", "+00:00")),
        application_id=application_id,
        create_google_event=False,
    )
    created.google_event_id = google_event_id
    created.meet_url = meet_url
    db.commit(); db.refresh(created)
    return created


@router.get("/google/check-connection", response_model=dict)
async def check_google_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has connected their Google account"""
    token = await get_valid_google_token(db, current_user.id)
    
    return {
        "connected": token is not None,
    }

@router.get("/google/events")
async def get_google_calendar_events(
    time_min: str = None,
    time_max: str = None,
    max_results: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get events from Google Calendar"""
    try:
        # Get valid access token
        access_token = await get_valid_google_token(db, current_user.id)
        if not access_token:
            raise HTTPException(status_code=401, detail="Google Calendar not connected")
            
        # Query parameters
        params = {
            "maxResults": max_results,
            "singleEvents": "true",
            "orderBy": "startTime"
        }
        
        if time_min:
            params["timeMin"] = time_min
            
        if time_max:
            params["timeMax"] = time_max
        
        # Request events from Google Calendar API
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers=headers,
            params=params
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Google Calendar API error: {response.text}"
            )
            
        return response.json().get("items", [])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new reminder with optional Google Calendar integration"""
    try:
        created_reminder = await service.create_reminder_with_calendar(
            db=db,
            user_id=current_user.id,
            title=reminder.title,
            description=reminder.description,
            due_date=reminder.due_date,
            application_id=reminder.application_id,
            create_google_event=reminder.create_google_event,
            add_meet_link=reminder.add_meet_link,
            calendar_id="primary",
            timezone_str=reminder.timezone_str,
        )
        
        return created_reminder
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's reminders"""
    reminders = await service.get_user_reminders(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return reminders


@router.delete("/reminders/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a reminder and its Google Calendar event (if any)"""
    await service.delete_reminder_and_google_event(
        db=db,
        user_id=current_user.id,
        reminder_id=reminder_id,
    )
    return


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    application_id: Optional[uuid.UUID] = None
    google_event_id: Optional[str] = None
    meet_url: Optional[str] = None

@router.patch("/reminders/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: uuid.UUID,
    patch: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id,
        models.Reminder.user_id == current_user.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")

    dirty = False
    if patch.title is not None: r.title = patch.title; dirty = True
    if patch.description is not None: r.description = patch.description; dirty = True
    if patch.due_date is not None: r.due_date = patch.due_date; dirty = True
    if patch.application_id is not None: r.application_id = patch.application_id; dirty = True

    # keep Google event description in sync when present (optional minimal sync)
    if dirty and r.google_event_id:
        try:
            access_token = await get_valid_google_token(db, current_user.id)
            if access_token:
                headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
                body = {}
                if patch.title is not None: body["summary"] = r.title
                if patch.description is not None: body["description"] = r.description or ""
                if patch.due_date is not None:
                    body["start"] = {"dateTime": r.due_date.isoformat()}
                    body["end"]   = {"dateTime": (r.due_date + timedelta(minutes=30)).isoformat()}
                if body:
                    requests.patch(
                        f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{r.google_event_id}",
                        headers=headers,
                        json=body,
                        timeout=10,
                    )
        except Exception as e:
            print(f"Warning: failed to sync Google event {r.google_event_id}: {e}")

    db.commit()
    db.refresh(r)
    return r
