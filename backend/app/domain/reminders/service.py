from __future__ import annotations
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from uuid import UUID

from .dto import ReminderDTO, ReminderNoteDTO
from .ports import IReminderRepo, IReminderNoteRepo, ICalendarGateway

class ReminderNotFound(Exception): ...
class CalendarException(Exception): ...

class ReminderService:
    def __init__(self, *, reminders: IReminderRepo, notes: IReminderNoteRepo, calendar: ICalendarGateway):
        self.reminders = reminders
        self.notes = notes
        self.calendar = calendar

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
    ) -> ReminderDTO:
        due = due_date or (datetime.now(timezone.utc) + timedelta(hours=1))

        dup = self.reminders.find_duplicate(
            user_id=user_id, title=title, application_id=application_id, due_date=due
        )
        if dup:
            return dup

        r = self.reminders.create(
            user_id=user_id, 
            title=title, 
            description=description, 
            due_date=due, 
            application_id=application_id,
            email_notifications_enabled=email_notifications_enabled,
            notification_schedule=notification_schedule,
            event_type=event_type,
        )

        # respect the flag (bugfix vs old code)
        if create_google_event:
            event_id, meet_url = await self.calendar.create_event(
                user_id=user_id,
                title=title,
                description=description,
                start=due,
                end=due + timedelta(minutes=30),
                calendar_id=calendar_id,
                timezone_str=timezone_str,
                add_meet_link=add_meet_link,
                private_props={"applytide": "1", "reminder_id": str(r.id), "application_id": str(application_id or "")},
            )
            r = self.reminders.set_google_fields(
                user_id=user_id, reminder_id=r.id, google_event_id=event_id, meet_url=meet_url
            )
        return r

    async def import_from_google_event(
        self, *, user_id: UUID, google_event_id: str, application_id: Optional[UUID]
    ) -> ReminderDTO:
        evt = await self.calendar.get_event(user_id=user_id, event_id=google_event_id)
        start = evt.get("start", {})
        dt_raw = start.get("dateTime") or (start.get("date") + "T09:00:00Z")
        title = evt.get("summary") or "Calendar event"
        desc = evt.get("description") or ""
        # meet URL
        meet_url = evt.get("hangoutLink")
        if not meet_url:
            for ep in (evt.get("conferenceData", {}) or {}).get("entryPoints", []) or []:
                if ep.get("entryPointType") == "video" and ep.get("uri"):
                    meet_url = ep["uri"]; break

        due = datetime.fromisoformat(dt_raw.replace("Z", "+00:00"))
        r = await self.create_reminder(
            user_id=user_id,
            title=title,
            description=desc,
            due_date=due,
            application_id=application_id,
            create_google_event=False,  # already exists
        )
        # attach the google id & meet url
        r = self.reminders.set_google_fields(user_id=user_id, reminder_id=r.id, google_event_id=google_event_id, meet_url=meet_url)
        return r

    async def update_reminder(
        self, *, user_id: UUID, reminder_id: UUID, patch: Dict, timezone_str: str = "UTC"
    ) -> ReminderDTO:
        r = self.reminders.get_owned(user_id=user_id, reminder_id=reminder_id)
        r2 = self.reminders.update(user_id=user_id, reminder_id=reminder_id, data=patch)

        # if linked to Google, push minimal sync
        if r2.google_event_id:
            body_changed = any(k in patch for k in ("title", "description", "due_date"))
            if body_changed:
                await self.calendar.update_event(
                    user_id=user_id,
                    event_id=r2.google_event_id,
                    title=patch.get("title"),
                    description=patch.get("description"),
                    start=patch.get("due_date"),
                    end=(patch.get("due_date") + timedelta(minutes=30)) if patch.get("due_date") else None,
                    timezone_str=timezone_str,
                )
        return r2

    async def list_reminders(self, *, user_id: UUID, skip: int, limit: int) -> List[ReminderDTO]:
        return self.reminders.list_for_user(user_id=user_id, skip=skip, limit=limit)

    async def delete_reminder(self, *, user_id: UUID, reminder_id: UUID) -> None:
        r = self.reminders.get_owned(user_id=user_id, reminder_id=reminder_id)
        if r.google_event_id:
            try:
                await self.calendar.delete_event(user_id=user_id, event_id=r.google_event_id)
            except Exception:
                # non-fatal
                pass
        # cascade notes first
        self.notes.delete_all_for_reminder(reminder_id=reminder_id)
        self.reminders.delete_owned(user_id=user_id, reminder_id=reminder_id)

    # -------- Notes --------
    def list_notes(self, *, user_id: UUID, reminder_id: UUID) -> List[ReminderNoteDTO]:
        return self.notes.list_for_reminder(user_id=user_id, reminder_id=reminder_id)

    def create_note(self, *, user_id: UUID, reminder_id: UUID, body: str) -> ReminderNoteDTO:
        return self.notes.create(user_id=user_id, reminder_id=reminder_id, body=body)

    def update_note(self, *, user_id: UUID, note_id: UUID, body: str) -> ReminderNoteDTO:
        return self.notes.update_owned(user_id=user_id, note_id=note_id, body=body)

    def delete_note(self, *, user_id: UUID, note_id: UUID) -> None:
        self.notes.delete_owned(user_id=user_id, note_id=note_id)

    # -------- Google helpers (for endpoints that show connection / events) --------
    async def google_connected(self, *, user_id: UUID) -> bool:
        return await self.calendar.is_connected(user_id=user_id)

    async def list_google_events(self, *, user_id: UUID, time_min: Optional[str], time_max: Optional[str], max_results: int) -> List[dict]:
        return await self.calendar.list_events(user_id=user_id, time_min=time_min, time_max=time_max, max_results=max_results)
