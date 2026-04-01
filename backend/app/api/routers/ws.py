"""
WebSocket Real-time Updates Router

Provides authenticated WebSocket connections for real-time bidirectional
communication.  Authentication uses **single-use tickets** obtained via
``POST /auth/ws-ticket`` (30-second Redis-backed tokens), or falls back
to the ``access_token`` HTTP-only cookie.

Security:
- Ticket is consumed (deleted from Redis) on first use → replay impossible.
- ``ws.accept()`` is called ONLY after successful authentication.
- Origin header is validated against ``settings.CORS_ORIGINS``.

Router: /ws
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from http.cookies import SimpleCookie
import uuid

from ...config import settings
from ...db.session import get_db
from ...infra.security.tokens import decode_access
from ...infra.security.ws_tickets import consume_ws_ticket
from ...db import models
from ...infra.logging import get_logger

router = APIRouter(prefix="/ws", tags=["ws"])
logger = get_logger(__name__)

# Store authenticated clients with their user IDs
authenticated_clients: dict[WebSocket, uuid.UUID] = {}

# ── Allowed origins for WS connections ───────────────────────────────────
_ALLOWED_ORIGINS: set[str] = set()


def _get_allowed_origins() -> set[str]:
    """Lazily build allowed-origin set from settings.CORS_ORIGINS."""
    global _ALLOWED_ORIGINS
    if not _ALLOWED_ORIGINS:
        raw = settings.CORS_ORIGINS
        if isinstance(raw, str):
            origins = [o.strip() for o in raw.split(",") if o.strip()]
        else:
            origins = list(raw)
        _ALLOWED_ORIGINS = {o.rstrip("/").lower() for o in origins}
    return _ALLOWED_ORIGINS


def _origin_allowed(ws: WebSocket) -> bool:
    """Return True if the Origin header is in the allow-list (or absent)."""
    origin = (ws.headers.get("origin") or "").rstrip("/").lower()
    if not origin:
        # Same-origin WS connections may omit Origin
        return True
    return origin in _get_allowed_origins()


def _cookie_access_token(ws: WebSocket) -> Optional[str]:
    raw = ws.headers.get("cookie")
    if not raw:
        return None
    c = SimpleCookie()
    c.load(raw)
    if "access_token" in c:
        return c["access_token"].value
    return None


def _authenticate_ticket(ticket: str, db: Session) -> Optional[models.User]:
    """Consume a single-use WS ticket and return the user, or None."""
    user_id = consume_ws_ticket(ticket)
    if user_id is None:
        return None
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user


def _authenticate_cookie(ws: WebSocket, db: Session) -> Optional[models.User]:
    """Validate JWT from the access_token cookie and return the user, or None."""
    token = _cookie_access_token(ws)
    if not token:
        return None
    try:
        payload = decode_access(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(models.User).filter(
            models.User.id == uuid.UUID(str(user_id))
        ).first()
    except Exception as e:
        logger.debug("WS cookie auth failed", extra={"error": str(e)})
        return None

@router.websocket("/updates")
async def updates(
    ws: WebSocket,
    token: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time updates.

    Authentication order:
        1. ``?token=<ticket>`` - single-use Redis ticket (preferred)
        2. ``access_token`` cookie - JWT fallback

    The connection is accepted **only after** the caller is authenticated.
    Origin is validated before any processing.
    """
    # ── Origin check ────────────────────────────────────────────────────
    if not _origin_allowed(ws):
        logger.warning("WS rejected: bad Origin", extra={"origin": ws.headers.get("origin")})
        await ws.close(code=1008, reason="Origin not allowed")
        return

    # ── Authenticate BEFORE accepting ───────────────────────────────────
    user: Optional[models.User] = None

    if token:
        user = _authenticate_ticket(token, db)

    if user is None:
        user = _authenticate_cookie(ws, db)

    if user is None:
        logger.warning("WS connection rejected: authentication failed")
        await ws.close(code=1008, reason="Authentication failed")
        return

    # ── Accept only after successful auth ───────────────────────────────
    await ws.accept()

    user_id_str = str(user.id)
    authenticated_clients[ws] = user.id
    logger.info("WebSocket connected", extra={"user_id": user_id_str})

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", extra={"user_id": user_id_str})
    except Exception as e:
        logger.error("WebSocket error", extra={"user_id": user_id_str, "error": str(e)}, exc_info=True)
        try:
            await ws.close(code=1011, reason="Internal server error")
        except Exception as close_err:
            logger.debug("Failed to close WebSocket", extra={"user_id": user_id_str, "error": str(close_err)})
    finally:
        authenticated_clients.pop(ws, None)


async def broadcast(event: dict, user_id: uuid.UUID = None):
    """
    Broadcast event to connected WebSocket clients.
    
    Sends JSON event to all connected clients or specific user. Used throughout
    the application to push real-time updates to frontend.
    
    Args:
        event: JSON-serializable dictionary containing event data
        user_id: Optional UUID to target specific user (broadcasts to all if None)
    
    Event Structure:
        {
            "type": str,  # Event type identifier (required)
            "data": dict,  # Event payload (optional)
            ...additional fields
        }
    
    Behavior:
        - If user_id provided: sends only to that user's connections
        - If user_id None: broadcasts to all authenticated connections
        - Automatically removes dead/failed connections
        - Non-blocking (doesn't wait for client acknowledgment)
    
    Error Handling:
        - Failed sends logged but don't raise exceptions
        - Dead connections automatically cleaned up
        - Continues broadcasting to other clients on individual failures
    
    Security:
        - Only sends to authenticated connections
        - Respects user_id targeting for privacy
        - No cross-user message leakage
    
    Notes:
        - Called from domain services (not API endpoint)
        - Async function (must be awaited)
        - Supports multiple connections per user
        - Logs broadcast activity for debugging
    
    Example Usage:
        # Broadcast to specific user
        await broadcast(
            {
                "type": "application_updated",
                "application_id": str(app_id),
                "stage": "Interview"
            },
            user_id=user.id
        )
        
        # Broadcast to all users
        await broadcast({
            "type": "system_maintenance",
            "message": "Scheduled maintenance in 10 minutes"
        })
    """
    try:
        dead = []
        target_clients = authenticated_clients.items()
        if user_id:
            target_clients = [
                (ws, uid)
                for ws, uid in authenticated_clients.items()
                if uid == user_id
            ]
            logger.debug(
                "Broadcasting to specific user",
                extra={"user_id": str(user_id), "event_type": event.get("type", "unknown")},
            )
        else:
            logger.debug(
                "Broadcasting to all users",
                extra={
                    "client_count": len(authenticated_clients),
                    "event_type": event.get("type", "unknown"),
                },
            )

        for ws, uid in list(target_clients):
            try:
                await ws.send_json(event)
            except Exception as e:
                logger.warning(
                    "Failed to send WebSocket message",
                    extra={"user_id": str(uid), "error": str(e)},
                )
                dead.append(ws)

        for ws in dead:
            authenticated_clients.pop(ws, None)
            logger.debug("Removed dead WebSocket connection")
    except Exception as e:
        logger.error(
            "Broadcast error",
            extra={"user_id": str(user_id) if user_id else None, "error": str(e)},
            exc_info=True,
        )
