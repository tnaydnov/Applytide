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
async def updates(ws: WebSocket, token: Optional[str] = Query(None), db: Session = Depends(get_db)):
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
        
        logger.info("WebSocket connection established", extra={"user_id": user_id_str})
        
        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected normally", extra={"user_id": user_id_str})
        finally:
            authenticated_clients.pop(ws, None)
            logger.debug("WebSocket client removed", extra={"user_id": user_id_str})
    except HTTPException:
        logger.warning("WebSocket authentication failed", extra={"user_id": user_id_str})
        await ws.close(code=1008, reason="Authentication failed")
    except Exception as e:
        logger.error("WebSocket error", extra={
            "user_id": user_id_str,
            "error": str(e)
        }, exc_info=True)
        await ws.close(code=1011, reason="Internal server error")

async def broadcast(event: dict, user_id: uuid.UUID = None):
    """
    Broadcast event to connected clients.
    If user_id is provided, only broadcast to that specific user.
    Otherwise, broadcast to all connected clients.
    """
    try:
        dead = []
        target_clients = authenticated_clients.items()
        if user_id:
            target_clients = [(ws, uid) for ws, uid in authenticated_clients.items() if uid == user_id]
            logger.debug("Broadcasting to specific user", extra={
                "user_id": str(user_id),
                "event_type": event.get("type", "unknown")
            })
        else:
            logger.debug("Broadcasting to all users", extra={
                "client_count": len(authenticated_clients),
                "event_type": event.get("type", "unknown")
            })
        
        for ws, uid in list(target_clients):
            try:
                await ws.send_json(event)
            except Exception as e:
                logger.warning("Failed to send WebSocket message", extra={
                    "user_id": str(uid),
                    "error": str(e)
                })
                dead.append(ws)
        
        for ws in dead:
            authenticated_clients.pop(ws, None)
            logger.debug("Removed dead WebSocket connection")
    except Exception as e:
        logger.error("Broadcast error", extra={
            "user_id": str(user_id) if user_id else None,
            "error": str(e)
        }, exc_info=True)
