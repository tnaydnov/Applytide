from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict
import re

# Allowed preference keys — extend as new preferences are added
ALLOWED_PREFERENCE_KEYS = {
    "theme", "language", "notifications", "dashboard_layout",
    "email_notifications", "sidebar_collapsed", "onboarding_completed",
    "contextual_help", "default_view", "timezone",
}

class PreferenceCreate(BaseModel):
    preference_key: str = Field(..., min_length=1, max_length=64, pattern=r'^[a-z][a-z0-9_]*$')
    preference_value: Dict[str, Any]

    @field_validator('preference_key')
    @classmethod
    def validate_key(cls, v: str) -> str:
        if v not in ALLOWED_PREFERENCE_KEYS:
            raise ValueError(f"Unknown preference key: {v}. Allowed: {', '.join(sorted(ALLOWED_PREFERENCE_KEYS))}")
        return v

class PreferenceUpdate(BaseModel):
    preference_value: Dict[str, Any]

class PreferenceOut(BaseModel):
    preference_key: str
    preference_value: Dict[str, Any]

    class Config:
        from_attributes = True
