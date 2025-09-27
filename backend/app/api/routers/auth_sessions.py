from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db import models
from app.api.deps_auth import get_current_user
from app.infra.security.tokens import decode_refresh
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RevokeRequest(BaseModel):
    session_id: str

def create_user_session(db, user_id, refresh_token_jti=None, device_info=None):
    device_info = device_info or {}
    session = models.UserSession(
        user_id=uuid.UUID(user_id),
        refresh_token_jti=refresh_token_jti,
        client_id=device_info.get("client_id", str(uuid.uuid4())),
        device_type=device_info.get("device_type", "browser"),
        ip_address=device_info.get("ip_address"),
        user_agent=device_info.get("user_agent"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TTL_DAYS)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions")
def list_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_jti = None
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            data = decode_refresh(refresh_token)
            current_jti = data.get("jti")
        except:
            pass

    sessions = (
        db.query(models.UserSession)
        .filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > func.now(),
        )
        .all()
    )

    return [
        {
            "id": str(s.id),
            "refresh_token_jti": s.refresh_token_jti,
            "client_id": s.client_id,
            "device_type": s.device_type,
            "user_agent": s.user_agent,
            "ip_address": s.ip_address,
            "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
            "created_at": s.created_at.isoformat(),
            "expires_at": s.expires_at.isoformat(),
            "is_current": s.refresh_token_jti == current_jti,
        }
        for s in sessions
    ]

@router.post("/sessions/revoke")
def revoke_session(
    payload: RevokeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    try:
        session_id = uuid.UUID(payload.session_id)
    except ValueError:
        return {"message": "Invalid session ID format"}

    session = (
        db.query(models.UserSession)
        .filter(
            models.UserSession.id == session_id,
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
        )
        .first()
    )

    if not session:
        return {"message": "Session not found or already revoked"}

    is_current_session = False
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token and session.refresh_token_jti:
        try:
            data = decode_refresh(refresh_token)
            current_jti = data.get("jti")
            is_current_session = (current_jti == session.refresh_token_jti)
        except:
            pass

    session.is_active = False

    if session.refresh_token_jti:
        token = (
            db.query(models.RefreshToken)
            .filter(
                models.RefreshToken.jti == session.refresh_token_jti,
                models.RefreshToken.revoked_at.is_(None),
            )
            .first()
        )
        if token:
            token.revoked_at = datetime.now(timezone.utc)

    db.commit()

    if is_current_session:
        response = JSONResponse(content={
            "message": "Your current session has been revoked",
            "current_session_revoked": True
        })
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/api/auth")
        return response

    return {"message": "Session revoked", "current_session_revoked": False}
