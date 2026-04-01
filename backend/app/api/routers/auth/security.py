"""
Security Settings

Aggregation endpoint returning the user's security posture:
- 2FA status
- Active session count
- Last password change (approximated from logs)
- Recent login history

Endpoints:
- GET /security - Get security settings overview
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ....db.session import get_db
from ....api.deps import get_current_user
from ....db.models import User, RefreshToken, ApplicationLog
from ....infra.logging import get_logger
from ...schemas.common import SecuritySettingsResponse

router = APIRouter()
logger = get_logger(__name__)


@router.get("/security", response_model=SecuritySettingsResponse)
def get_security_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get an overview of the user's security settings.

    Returns:
        dict with:
        - two_factor_enabled: bool
        - active_sessions: int
        - last_password_change: ISO timestamp or empty string
        - login_history: list of recent login events
    """
    # Count active sessions
    active_count = (
        db.query(RefreshToken)
        .filter(
            and_(
                RefreshToken.user_id == current_user.id,
                RefreshToken.is_active == True,
                RefreshToken.revoked_at == None,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        .count()
    )

    # Try to find last password change from logs
    last_pw = ""
    pw_log = (
        db.query(ApplicationLog)
        .filter(
            and_(
                ApplicationLog.user_id == current_user.id,
                ApplicationLog.endpoint.ilike("%change-password%"),
                ApplicationLog.status_code == 200,
            )
        )
        .order_by(ApplicationLog.timestamp.desc())
        .first()
    )
    if pw_log and pw_log.timestamp:
        last_pw = pw_log.timestamp.isoformat()

    # Recent login history (from refresh tokens creation = login events)
    recent_tokens = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == current_user.id)
        .order_by(RefreshToken.created_at.desc())
        .limit(10)
        .all()
    )

    login_history = []
    for t in recent_tokens:
        login_history.append({
            "ip": t.ip_address or "",
            "location": "",  # GeoIP not implemented
            "device": _parse_device(t.user_agent),
            "timestamp": t.created_at.isoformat() if t.created_at else "",
        })

    # 2FA status from user model (will be populated once 2FA columns exist)
    two_fa = getattr(current_user, "totp_enabled", False) or False

    return {
        "two_factor_enabled": two_fa,
        "active_sessions": active_count,
        "last_password_change": last_pw,
        "login_history": login_history,
    }


def _parse_device(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown Device"
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile Browser"
    if "tablet" in ua or "ipad" in ua:
        return "Tablet"
    return "Desktop Browser"
