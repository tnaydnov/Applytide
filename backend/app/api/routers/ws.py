"""
WebSocket Real-time Updates Router

This module provides WebSocket endpoints for real-time bidirectional communication
between Applytide backend and frontend clients. Enables instant updates for
application status changes, job notifications, and system events.

Key Features:
- WebSocket connection management with authentication
- Token-based authentication (query param or cookie)
- Per-user connection tracking
- Targeted and broadcast messaging
- Automatic cleanup of dead connections
- Graceful disconnect handling

Use Cases:
- Real-time application status updates
- Instant job matching notifications
- Document processing progress
- System-wide announcements

Dependencies:
- JWT token authentication
- User session management
- Database session for user validation

Router: /api/ws
"""
from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from http.cookies import SimpleCookie
import uuid

from ...db.session import get_db
from ...infra.security.tokens import decode_access
from ...db import models
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/ws", tags=["ws"])
logger = get_logger(__name__)

# Store authenticated clients with their user IDs
authenticated_clients: dict[WebSocket, uuid.UUID] = {}

async def _user_from_token_str(token: str, db: Session) -> models.User:
    try:
        payload = decode_access(token)
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("WebSocket auth failed: Invalid token payload")
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(models.User).filter(models.User.id == uuid.UUID(str(user_id))).first()
        if not user:
            logger.warning("WebSocket auth failed: User not found", extra={"user_id": user_id})
            raise HTTPException(status_code=401, detail="User not found")
        logger.debug("WebSocket user authenticated", extra={"user_id": str(user.id)})
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error("WebSocket authentication error", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(status_code=401, detail="Authentication failed")

def _cookie_access_token(ws: WebSocket) -> Optional[str]:
    raw = ws.headers.get("cookie")
    if not raw:
        return None
    c = SimpleCookie()
    c.load(raw)
    if "access_token" in c:
        return c["access_token"].value
    return None

@router.websocket("/updates")
async def updates(
    ws: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time updates.
    
    Establishes persistent WebSocket connection for receiving real-time updates
    about applications, jobs, documents, and system events. Requires authentication
    via JWT token.
    
    Query Parameters:
        - token: JWT access token (optional if provided in cookie)
    
    Cookie:
        - access_token: JWT token (used if query param not provided)
    
    Args:
        ws: WebSocket connection from FastAPI
        token: Optional JWT token from query parameter
        db: Database session from dependency injection
    
    Connection Flow:
        1. Accept WebSocket connection
        2. Authenticate via token (query param or cookie)
        3. Register client with user_id
        4. Keep connection alive listening for messages
        5. Cleanup on disconnect
    
    Authentication:
        - Requires valid JWT access token
        - Token from query param OR cookie (query takes precedence)
        - Connection closed with 1008 if authentication fails
        - User must exist in database
    
    Events Received:
        - Client can send text messages (currently ignored, used for keepalive)
        - Server broadcasts JSON events to connected clients
    
    Events Sent:
        - Application status changes
        - New job matches
        - Document processing completion
        - System notifications
        - Custom events via broadcast() function
    
    Error Handling:
        - 1008: Authentication failed or invalid token
        - 1011: Internal server error
        - Automatic cleanup of dead connections
        - Logged disconnects for monitoring
    
    Security:
        - JWT token validation required
        - Per-user connection isolation
        - No cross-user message leakage
        - Automatic disconnection on auth failure
    
    Notes:
        - Connection kept alive until client disconnects
        - Supports multiple connections per user
        - Messages sent via broadcast() helper function
        - Dead connections automatically cleaned up
        - Logs connection/disconnection for analytics
    
    Example:
        WebSocket: /api/ws/updates?token=<jwt_token>
        Or with cookie:
        WebSocket: /api/ws/updates
        Cookie: access_token=<jwt_token>
        
        Server sends:
        {
            "type": "application_status_changed",
            "application_id": "550e8400...",
            "stage": "Interview"
        }
    """
    await ws.accept()
    user_id_str = "unknown"
    try:
        token = token or _cookie_access_token(ws)
        if not token:
            logger.warning("WebSocket connection rejected: No token")
            await ws.close(code=1008, reason="Authentication failed")
            return

        user = await _user_from_token_str(token, db)
        user_id_str = str(user.id)
        authenticated_clients[ws] = user.id

        logger.info(
            "WebSocket connection established", extra={"user_id": user_id_str}
        )

        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            logger.info(
                "WebSocket disconnected normally", extra={"user_id": user_id_str}
            )
        finally:
            authenticated_clients.pop(ws, None)
            logger.debug("WebSocket client removed", extra={"user_id": user_id_str})
    except HTTPException:
        logger.warning(
            "WebSocket authentication failed", extra={"user_id": user_id_str}
        )
        await ws.close(code=1008, reason="Authentication failed")
    except Exception as e:
        logger.error(
            "WebSocket error",
            extra={"user_id": user_id_str, "error": str(e)},
            exc_info=True,
        )
        await ws.close(code=1011, reason="Internal server error")


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
