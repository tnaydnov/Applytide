from __future__ import annotations
from typing import Optional, List, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta, timezone

from ...db import models
from ...domain.reminders.ports import IReminderRepo, IReminderNoteRepo
from ...domain.reminders.dto import ReminderDTO, ReminderNoteDTO
from ...infra.logging import get_logger

_logger = get_logger(__name__)

def _r_to_dto(r: models.Reminder) -> ReminderDTO:
    return ReminderDTO(
        id=r.id, user_id=r.user_id, title=r.title, description=r.description,
        due_date=r.due_date, application_id=r.application_id,
        google_event_id=r.google_event_id, meet_url=r.meet_url,
        created_at=r.created_at, updated_at=r.updated_at,
        event_type=r.event_type or "general",
        email_notifications_enabled=r.email_notifications_enabled or False,
        notification_schedule=r.notification_schedule,
        ai_prep_tips_enabled=r.ai_prep_tips_enabled or False,
        ai_prep_tips_generated=r.ai_prep_tips_generated,
        ai_prep_tips_generated_at=r.ai_prep_tips_generated_at,
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

    def create(self, *, user_id: UUID, title: str, description: Optional[str], due_date: datetime, application_id: Optional[UUID], email_notifications_enabled: bool = False, notification_schedule: Optional[dict] = None, event_type: Optional[str] = "general", user_timezone: Optional[str] = "UTC", ai_prep_tips_enabled: bool = False) -> ReminderDTO:
        r = models.Reminder(
            user_id=user_id, 
            title=title, 
            description=description, 
            due_date=due_date, 
            application_id=application_id,
            email_notifications_enabled=email_notifications_enabled,
            notification_schedule=notification_schedule,
            event_type=event_type,
            user_timezone=user_timezone,
            ai_prep_tips_enabled=ai_prep_tips_enabled,
        )
        self.db.add(r)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(r)
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
        self.db.add(r)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(r)
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
        self.db.delete(r)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def set_google_fields(self, *, user_id: UUID, reminder_id: UUID, google_event_id: Optional[str], meet_url: Optional[str]) -> ReminderDTO:
        r = self.db.get(models.Reminder, reminder_id)
        if not r or r.user_id != user_id:
            raise LookupError
        r.google_event_id = google_event_id
        r.meet_url = meet_url
        self.db.add(r)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(r)
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
        self.db.add(n)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(n)
        return _n_to_dto(n)

    def update_owned(self, *, user_id: UUID, note_id: UUID, body: str) -> ReminderNoteDTO:
        n = self.db.get(models.ReminderNote, note_id)
        if not n or n.user_id != user_id:
            raise LookupError
        n.body = body
        n.updated_at = datetime.now(timezone.utc)
        self.db.add(n)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(n)
        return _n_to_dto(n)

    def delete_owned(self, *, user_id: UUID, note_id: UUID) -> None:
        n = self.db.get(models.ReminderNote, note_id)
        if not n or n.user_id != user_id:
            raise LookupError
        self.db.delete(n)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def delete_all_for_reminder(self, *, reminder_id: UUID) -> None:
        self.db.query(models.ReminderNote).filter(models.ReminderNote.reminder_id == reminder_id).delete()
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise


# ── Lightweight lookups for background tasks ────────────────────────────
# These create their own session because the AI-tips task runs detached
# from the HTTP request lifecycle (asyncio.create_task).

from ...db.session import SessionLocal


class UserLookupSQLA:
    """IUserLookup implementation backed by SQLAlchemy."""

    def get_email_and_name(self, user_id: UUID):
        db = SessionLocal()
        try:
            user = db.get(models.User, user_id)
            if not user:
                return None
            name = user.full_name or user.email.split("@")[0]
            return (user.email, name)
        except Exception:
            _logger.error("UserLookup failed", exc_info=True)
            return None
        finally:
            db.close()


class ResumeLookupSQLA:
    """IResumeLookup implementation backed by SQLAlchemy."""

    def get_text(self, resume_id: UUID):
        db = SessionLocal()
        try:
            resume = db.get(models.Resume, resume_id)
            if resume and resume.text:
                return resume.text
            return None
        except Exception:
            _logger.error("ResumeLookup failed", exc_info=True)
            return None
        finally:
            db.close()
