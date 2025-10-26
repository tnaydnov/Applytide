from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple

import requests
from sqlalchemy.orm import Session

from ...config import settings
from ...db import models

# ---- Internal helpers (formerly auth/oauth/base.py) -----------------

def _calc_expires_at(token_data: Dict[str, Any]) -> Optional[datetime]:
    expires_in = token_data.get("expires_in")
    if not expires_in:
        return None
    return datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

def _save_oauth_token(db: Session, user_id: uuid.UUID, provider: str, token_data: Dict[str, Any]) -> models.OAuthToken:
    tok = db.query(models.OAuthToken).filter(
        models.OAuthToken.user_id == user_id,
        models.OAuthToken.provider == provider
    ).first()

    expires_at = _calc_expires_at(token_data)

    if tok:
        tok.access_token = token_data.get("access_token")
        if token_data.get("refresh_token"):
            tok.refresh_token = token_data.get("refresh_token")
        tok.expires_at = expires_at
        tok.token_type = token_data.get("token_type")
        tok.scope = token_data.get("scope")
        tok.updated_at = datetime.now(timezone.utc)
    else:
        tok = models.OAuthToken(
            user_id=user_id,
            provider=provider,
            access_token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            expires_at=expires_at,
            token_type=token_data.get("token_type"),
            scope=token_data.get("scope"),
        )
        db.add(tok)

    db.commit()
    db.refresh(tok)
    return tok

def _get_oauth_token(db: Session, user_id: uuid.UUID, provider: str) -> Optional[models.OAuthToken]:
    return db.query(models.OAuthToken).filter(
        models.OAuthToken.user_id == user_id,
        models.OAuthToken.provider == provider
    ).first()

def _token_is_valid(tok: models.OAuthToken) -> bool:
    if not tok or not tok.expires_at:
        return False
    # 5 min buffer
    return tok.expires_at > datetime.now(timezone.utc) + timedelta(minutes=5)


# ---- Public service -------------------------------------------------

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3"


class OAuthService:
    """Google OAuth login + token lifecycle in one place."""

    def __init__(self, db: Session):
        self.db = db

    # ----- Authorization URL -----
    def get_google_authorization_url(self, state: str) -> str:
        from urllib.parse import urlencode
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(settings.GOOGLE_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state or "",
        }
        return GOOGLE_AUTH_URL + "?" + urlencode(params)

    # ----- Token exchange + user info -----
    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        payload = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        }
        r = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
        if r.status_code != 200:
            raise RuntimeError(f"Failed to get token: {r.text}")
        return r.json()

    def get_google_user_info(self, access_token: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {access_token}"}
        r = requests.get(GOOGLE_USERINFO_URL, headers=headers, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Failed to get user info: {r.text}")
        return r.json()

    # ----- High-level login flow -----
    def process_google_login(
        self, 
        code: str,
        legal_agreements: dict = None,
        ip_address: str = None
    ) -> Tuple[models.User, bool]:
        token_data = self.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        info = self.get_google_user_info(access_token)

        google_id = info.get("sub")
        email = info.get("email")
        name = info.get("name")

        user = self.db.query(models.User).filter(models.User.google_id == google_id).first()
        is_new = False

        if not user:
            user = self.db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.google_id = google_id
                user.is_oauth_user = True
                if not user.email_verified_at:
                    user.email_verified_at = datetime.now(timezone.utc)
                self.db.commit()
            else:
                is_new = True
                now = datetime.now(timezone.utc)
                
                # Store legal agreements for new OAuth users
                user = models.User(
                    id=uuid.uuid4(),
                    email=email,
                    full_name=name,
                    google_id=google_id,
                    is_oauth_user=True,
                    email_verified_at=now,
                    # Legal agreement tracking
                    terms_accepted_at=now if legal_agreements else None,
                    privacy_accepted_at=now if legal_agreements else None,
                    terms_version="1.0" if legal_agreements else None,
                    acceptance_ip=ip_address if legal_agreements else None,
                )
                self.db.add(user)
                self.db.commit()
                self.db.refresh(user)

        _save_oauth_token(self.db, user.id, "google", token_data)
        return user, is_new

    # ----- Token lifecycle -----
    def refresh_google_token(self, user_id: uuid.UUID) -> Optional[str]:
        tok = _get_oauth_token(self.db, user_id, "google")
        if not tok or not tok.refresh_token:
            return None

        payload = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": tok.refresh_token,
            "grant_type": "refresh_token",
        }
        r = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
        if r.status_code != 200:
            return None

        data = r.json()
        _save_oauth_token(self.db, user_id, "google", data)
        return data.get("access_token")

    def get_valid_google_access_token(self, user_id: uuid.UUID) -> Optional[str]:
        tok = _get_oauth_token(self.db, user_id, "google")
        if not tok:
            return None
        if _token_is_valid(tok):
            return tok.access_token
        if tok.refresh_token:
            return self.refresh_google_token(user_id)
        return None


# ----- Convenience helper for modules that just need a token -----

def get_valid_google_token(db: Session, user_id: uuid.UUID) -> Optional[str]:
    return OAuthService(db).get_valid_google_access_token(user_id)
