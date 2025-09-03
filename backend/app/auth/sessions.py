# backend/auth/sessions.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from ..db.session import get_db
from ..db import models
from ..auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])  # ensure prefix matches FE

class RevokeRequest(BaseModel):
    jti: str

@router.get("/sessions")
def list_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active (not revoked, not expired) sessions for the current user"""
    tokens = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.user_id == current_user.id,
            models.RefreshToken.revoked_at.is_(None),
            models.RefreshToken.expires_at > func.now(),   # not expired
        )
        .all()
    )
    return [
        {
            "jti": t.jti,
            "family_id": t.family_id,
            "user_agent": t.user_agent,
            "ip_address": t.ip_address,
            "created_at": t.created_at.isoformat(),
            "expires_at": t.expires_at.isoformat(),
        }
        for t in tokens
    ]

@router.post("/sessions/revoke")
def revoke_session(
    payload: RevokeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session by jti"""
    token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.jti == payload.jti,
            models.RefreshToken.user_id == current_user.id,
            models.RefreshToken.revoked_at.is_(None),
        )
        .first()
    )
    if not token:
        return {"message": "Session not found or already revoked"}
    token.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Session revoked"}
