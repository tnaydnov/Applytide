"""
User Sessions Management

Provides endpoints to list and revoke active sessions (refresh tokens).

Endpoints:
- GET /sessions - List all active sessions for the current user
- DELETE /sessions/{session_id} - Revoke a specific session
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ....db.session import get_db
from ....api.deps import get_current_user
from ....api.schemas import auth as schemas
from ....db.models import User, RefreshToken
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _parse_device(user_agent: str | None) -> str:
    """Extract a human-readable device name from a user-agent string."""
    if not user_agent:
        return "Unknown Device"
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile Browser"
    if "tablet" in ua or "ipad" in ua:
        return "Tablet"
    return "Desktop Browser"


@router.get("/sessions", response_model=list[schemas.SessionOut])
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all active sessions for the authenticated user.

    Returns a list of active refresh tokens representing login sessions,
    including device info, IP, and last activity timestamp.

    Returns:
        list of session objects with id, device, ip, location, last_active, current
    """
    tokens = (
        db.query(RefreshToken)
        .filter(
            and_(
                RefreshToken.user_id == current_user.id,
                RefreshToken.is_active == True,
                RefreshToken.revoked_at == None,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        .order_by(RefreshToken.last_used_at.desc())
        .all()
    )

    # Determine which token is the "current" session based on request cookies
    current_jti = None
    try:
        from ....infra.security.tokens import decode_access
        access = request.cookies.get("access_token")
        if access:
            payload = decode_access(access)
            current_jti = payload.get("jti")
    except Exception as e:
        logger.debug("Could not decode current session token", extra={"error": str(e)})

    sessions = []
    for t in tokens:
        sessions.append({
            "id": str(t.id),
            "device": _parse_device(t.user_agent),
            "ip": t.ip_address or "",
            "location": "",  # GeoIP not implemented
            "last_active": t.last_used_at.isoformat() if t.last_used_at else t.created_at.isoformat(),
            "current": t.jti == current_jti if current_jti else False,
        })

    return sessions


@router.delete("/sessions/{session_id}", response_model=schemas.MessageResponse)
def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke a specific session by its ID.

    The refresh token is marked as revoked and inactive,
    effectively logging out that session.

    Args:
        session_id: UUID of the refresh token / session to revoke

    Returns:
        dict with success message

    Raises:
        HTTPException 404 if session not found or doesn't belong to user
    """
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    token = (
        db.query(RefreshToken)
        .filter(
            and_(
                RefreshToken.id == sid,
                RefreshToken.user_id == current_user.id,
            )
        )
        .first()
    )

    if not token:
        raise HTTPException(status_code=404, detail="Session not found")

    token.is_active = False
    token.revoked_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to revoke session")

    logger.info(
        "Session revoked",
        extra={"user_id": str(current_user.id), "session_id": session_id},
    )
    return {"message": "Session revoked successfully"}
