from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

@dataclass
class OAuthTokenDTO:
    id: UUID
    user_id: UUID
    provider: str
    access_token: str
    refresh_token: Optional[str]
    expires_at: Optional[datetime]
    token_type: Optional[str]
    scope: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
