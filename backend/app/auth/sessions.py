from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from ..auth.deps import get_current_user

router = APIRouter(tags=["auth"])

@router.get("/sessions")
def list_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List active sessions for the current user"""
    tokens = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == current_user.id,
        models.RefreshToken.revoked_at.is_(None),
        models.RefreshToken.expires_at > models.RefreshToken.created_at
    ).all()
    return [
        {
            "jti": t.jti,
            "family_id": t.family_id,
            "user_agent": t.user_agent,
            "ip_address": t.ip_address,
            "created_at": t.created_at.isoformat(),
            "expires_at": t.expires_at.isoformat()
        }
        for t in tokens
    ]

@router.post("/sessions/revoke")
def revoke_session(jti: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke a specific session by jti"""
    token = db.query(models.RefreshToken).filter(
        models.RefreshToken.jti == jti,
        models.RefreshToken.user_id == current_user.id,
        models.RefreshToken.revoked_at.is_(None)
    ).first()
    if token:
        token.revoked_at = token.created_at  # Use now if you want
        db.commit()
        return {"message": "Session revoked"}
    return {"message": "Session not found or already revoked"}
