from __future__ import annotations
from typing import Optional, List, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

from ...db import models
from ...domain.reminders.ports import IReminderRepo, IReminderNoteRepo
from ...domain.reminders.dto import ReminderDTO, ReminderNoteDTO

def _r_to_dto(r: models.Reminder) -> ReminderDTO:
    return ReminderDTO(
        id=r.id, user_id=r.user_id, title=r.title, description=r.description,
        due_date=r.due_date, application_id=r.application_id,
        google_event_id=r.google_event_id, meet_url=r.meet_url,
        created_at=r.created_at, updated_at=r.updated_at
    )

def _n_to_dto(n: models.ReminderNote) -> ReminderNoteDTO:
    return ReminderNoteDTO(
        id=n.id, reminder_id=n.reminder_id, user_id=n.user_id,
        body=n.body, created_at=n.created_at, updated_at=n.updated_at
    )

class ReminderSQLARepository(IReminderRepo):
    def __init__(self, db: Session): self.db = db

    def find_duplicate(self, *, user_id: UUID, title: str, application_id: Optional[UUID], due_date: datetime) -> Optional[ReminderDTO]:
        row = self.db.execute(
            select(models.Reminder).where(
                models.Reminder.user_id == user_id,
                models.Reminder.title == title,
                models.Reminder.application_id == application_id,
                models.Reminder.due_date.between(due_date - timedelta(minutes=2), due_date + timedelta(minutes=2)),
            )
        ).scalar_one_or_none()
        return _r_to_dto(row) if row else None

    def create(self, *, user_id: UUID, title: str, description: Optional[str], due_date: datetime, application_id: Optional[UUID]) -> ReminderDTO:
        r = models.Reminder(user_id=user_id, title=title, description=description, due_date=due_date, application_id=application_id)
        self.db.add(r); self.db.commit(); self.db.refresh(r)
        return _r_to_dto(r)

    def get_owned(self, *, user_id: UUID, reminder_id: UUID) -> ReminderDTO:
        r = self.db.get(models.Reminder, reminder_id)
        if not r or r.user_id != user_id:
            raise LookupError
        return _r_to_dto(r)

    def update(self, *, user_id: UUID, reminder_id: UUID, data: Dict) -> ReminderDTO:
        r = self.db.get(models.Reminder, reminder_id)
        if not r or r.user_id != user_id:
            raise LookupError
        for k, v in data.items():
            if v is not None:
                setattr(r, k, v)
        r.updated_at = datetime.now(timezone.utc)
        self.db.add(r); self.db.commit(); self.db.refresh(r)
        return _r_to_dto(r)

    def list_for_user(self, *, user_id: UUID, skip: int, limit: int) -> List[ReminderDTO]:
        rows = self.db.execute(
            select(models.Reminder).where(models.Reminder.user_id == user_id).order_by(models.Reminder.due_date.asc()).offset(skip).limit(limit)
        ).scalars().all()
        return [_r_to_dto(x) for x in rows]

    def delete_owned(self, *, user_id: UUID, reminder_id: UUID) -> None:
        r = self.db.get(models.Reminder, reminder_id)
        if not r or r.user_id != user_id:
            raise LookupError
        self.db.delete(r); self.db.commit()

    def set_google_fields(self, *, user_id: UUID, reminder_id: UUID, google_event_id: Optional[str], meet_url: Optional[str]) -> ReminderDTO:
        r = self.db.get(models.Reminder, reminder_id)
        if not r or r.user_id != user_id:
            raise LookupError
        r.google_event_id = google_event_id
        r.meet_url = meet_url
        self.db.add(r); self.db.commit(); self.db.refresh(r)
        return _r_to_dto(r)

class ReminderNoteSQLARepository(IReminderNoteRepo):
    def __init__(self, db: Session): self.db = db

    def list_for_reminder(self, *, user_id: UUID, reminder_id: UUID) -> List[ReminderNoteDTO]:
        rows = self.db.execute(
            select(models.ReminderNote).where(models.ReminderNote.user_id == user_id, models.ReminderNote.reminder_id == reminder_id).order_by(models.ReminderNote.created_at.asc())
        ).scalars().all()
        return [_n_to_dto(x) for x in rows]

    def create(self, *, user_id: UUID, reminder_id: UUID, body: str) -> ReminderNoteDTO:
        n = models.ReminderNote(user_id=user_id, reminder_id=reminder_id, body=body)
        self.db.add(n); self.db.commit(); self.db.refresh(n)
        return _n_to_dto(n)

    def update_owned(self, *, user_id: UUID, note_id: UUID, body: str) -> ReminderNoteDTO:
        n = self.db.get(models.ReminderNote, note_id)
        if not n or n.user_id != user_id:
            raise LookupError
        n.body = body
        n.updated_at = datetime.now(timezone.utc)
        self.db.add(n); self.db.commit(); self.db.refresh(n)
        return _n_to_dto(n)

    def delete_owned(self, *, user_id: UUID, note_id: UUID) -> None:
        n = self.db.get(models.ReminderNote, note_id)
        if not n or n.user_id != user_id:
            raise LookupError
        self.db.delete(n); self.db.commit()

    def delete_all_for_reminder(self, *, reminder_id: UUID) -> None:
        self.db.query(models.ReminderNote).filter(models.ReminderNote.reminder_id == reminder_id).delete()
        self.db.commit()
