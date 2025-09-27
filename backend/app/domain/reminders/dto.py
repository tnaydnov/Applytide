from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

@dataclass
class ReminderDTO:
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

@dataclass
class ReminderNoteDTO:
    id: UUID
    reminder_id: UUID
    user_id: UUID
    body: str
    created_at: datetime
    updated_at: datetime
