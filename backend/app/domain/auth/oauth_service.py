from __future__ import annotations
from typing import Dict, Any, Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

from .ports import IOAuthTokenRepo, IHTTPClient, ISettings
from ...db import models  # reuse your ORM models for user lookups

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

class OAuthError(Exception):
    ...

class OAuthService:
    def __init__(self, *, token_repo: IOAuthTokenRepo, http: IHTTPClient, settings: ISettings, db):
        self.token_repo = token_repo
        self.http = http
        self.settings = settings
        self.db = db  # SQLAlchemy Session factory or Session (we’ll pass a Session from DI)

    # ---------- Google auth URL ----------
    def google_authorization_url(self, state: str) -> str:
        params = {
            "client_id": self.settings.GOOGLE_CLIENT_ID,
            "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(self.settings.GOOGLE_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return GOOGLE_AUTH_URL + "?" + urlencode(params)

    # ---------- Google token exchange ----------
    def exchange_google_code_for_token(self, code: str) -> Dict[str, Any]:
        payload = {
            "client_id": self.settings.GOOGLE_CLIENT_ID,
            "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
        }
        r = self.http.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
        if getattr(r, "status_code", 200) != 200:
            raise OAuthError(f"Failed to get token: {getattr(r, 'text', r)}")
        return r.json()

    def google_userinfo(self, access_token: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {access_token}"}
        r = self.http.get(GOOGLE_USERINFO_URL, headers=headers, timeout=10)
        if getattr(r, "status_code", 200) != 200:
            raise OAuthError(f"Failed to get user info: {getattr(r, 'text', r)}")
        return r.json()

    # ---------- Login / link / create ----------
    def process_google_login(self, *, code: str) -> Tuple[models.User, bool]:
        token_data = self.exchange_google_code_for_token(code)
        access_token = token_data.get("access_token")
        info = self.google_userinfo(access_token)
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
                user = models.User(
                    id=uuid4(),
                    email=email,
                    full_name=name,
                    google_id=google_id,
                    is_oauth_user=True,
                    email_verified_at=datetime.now(timezone.utc),
                )
                self.db.add(user); self.db.commit(); self.db.refresh(user)

        # Save tokens
        self.token_repo.upsert_token(user_id=user.id, provider="google", token_data=token_data)
        return user, is_new

    # ---------- Refreshing ----------
    def refresh_google_token(self, *, user_id: UUID) -> Optional[str]:
        tok = self.token_repo.get_token(user_id=user_id, provider="google")
        if not tok or not getattr(tok, "refresh_token", None):
            return None

        payload = {
            "client_id": self.settings.GOOGLE_CLIENT_ID,
            "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": tok.refresh_token,
            "grant_type": "refresh_token",
        }
        r = self.http.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
        if getattr(r, "status_code", 200) != 200:
            return None
        data = r.json()
        self.token_repo.upsert_token(user_id=user_id, provider="google", token_data=data)
        return data.get("access_token")

    def get_valid_google_access_token(self, *, user_id: UUID) -> Optional[str]:
        tok = self.token_repo.get_token(user_id=user_id, provider="google")
        if not tok:
            return None
        if self.token_repo.token_is_valid(tok):
            return tok.access_token
        if getattr(tok, "refresh_token", None):
            return self.refresh_google_token(user_id=user_id)
        return None
