from __future__ import annotations
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from ...db import models
from ...domain.auth.ports import IOAuthTokenRepo

class OAuthTokenSQLARepo(IOAuthTokenRepo):
    def __init__(self, db: Session):
        self.db = db

    def upsert_token(self, *, user_id: UUID, provider: str, token_data: Dict[str, Any]) -> None:
        rec = self.db.query(models.OAuthToken).filter(
            models.OAuthToken.user_id == user_id,
            models.OAuthToken.provider == provider,
        ).first()

        expires_at = None
        expires_in = token_data.get("expires_in")
        if expires_in:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

        if rec:
            rec.access_token = token_data.get("access_token")
            if token_data.get("refresh_token"):
                rec.refresh_token = token_data.get("refresh_token")
            rec.expires_at = expires_at
            rec.token_type = token_data.get("token_type")
            rec.scope = token_data.get("scope")
            rec.updated_at = datetime.now(timezone.utc)
        else:
            rec = models.OAuthToken(
                user_id=user_id,
                provider=provider,
                access_token=token_data.get("access_token"),
                refresh_token=token_data.get("refresh_token"),
                expires_at=expires_at,
                token_type=token_data.get("token_type"),
                scope=token_data.get("scope"),
            )
            self.db.add(rec)
        self.db.commit()

    def get_token(self, *, user_id: UUID, provider: str) -> Optional[models.OAuthToken]:
        return self.db.query(models.OAuthToken).filter(
            models.OAuthToken.user_id == user_id,
            models.OAuthToken.provider == provider,
        ).first()

    def token_is_valid(self, token_obj: models.OAuthToken) -> bool:
        if not token_obj or not token_obj.expires_at:
            return False
        # 5-minute safety buffer
        return token_obj.expires_at > datetime.now(timezone.utc) + timedelta(minutes=5)
