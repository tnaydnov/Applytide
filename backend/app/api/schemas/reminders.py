"""
Reminders API Schemas

Pydantic models for reminder API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid
from datetime import datetime


# ----- Base Schemas -----
class ReminderBase(BaseModel):
    """Base reminder schema with common fields."""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    due_date: datetime
    application_id: Optional[uuid.UUID] = None


class ReminderCreate(ReminderBase):
    """Schema for creating a new reminder."""
    create_google_event: bool = Field(default=True)
    add_meet_link: bool = Field(default=False)
    email_notifications_enabled: bool = Field(default=False)
    notification_schedule: Optional[Dict[str, Any]] = None
    event_type: str = Field(default="general")
    timezone_str: str = Field(default="UTC")
    user_timezone: str = Field(default="UTC")


class ReminderUpdate(BaseModel):
    """Schema for updating an existing reminder."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    due_date: Optional[datetime] = None
    application_id: Optional[uuid.UUID] = None


class ReminderResponse(ReminderBase):
    """Schema for reminder response."""
    id: uuid.UUID
    user_id: uuid.UUID
    google_event_id: Optional[str] = None
    meet_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ----- Reminder Notes -----
class ReminderNoteCreate(BaseModel):
    """Schema for creating a reminder note."""
    body: str = Field(..., min_length=1, max_length=50000)


class ReminderNoteUpdate(BaseModel):
    """Schema for updating a reminder note."""
    body: str = Field(..., min_length=1, max_length=50000)


class ReminderNoteOut(BaseModel):
    """Schema for reminder note response."""
    id: uuid.UUID
    reminder_id: uuid.UUID
    user_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
