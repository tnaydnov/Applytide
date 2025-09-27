from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from http.cookies import SimpleCookie
from ..db.session import get_db
from ..auth.tokens import decode_access
from ..db import models
import uuid

router = APIRouter(prefix="/api/ws", tags=["ws"])

# Store authenticated clients with their user IDs
authenticated_clients: dict[WebSocket, uuid.UUID] = {}

async def _user_from_token_str(token: str, db: Session) -> models.User:
    try:
        payload = decode_access(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(models.User).filter(models.User.id == uuid.UUID(str(user_id))).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
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


async def get_user_from_token(token: str, db: Session) -> models.User:
    """Get user from access token for WebSocket authentication"""
    try:
        payload = decode_access(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                raise HTTPException(status_code=401, detail="Invalid user ID")
                
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.websocket("/updates")
async def updates(ws: WebSocket, token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    await ws.accept()  # accept first
    try:
        token = token or _cookie_access_token(ws)
        if not token:
            await ws.close(code=1008, reason="Authentication failed"); return
        user = await _user_from_token_str(token, db)
        authenticated_clients[ws] = user.id
        try:
            while True: await ws.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            authenticated_clients.pop(ws, None)
    except HTTPException:
        await ws.close(code=1008, reason="Authentication failed")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await ws.close(code=1011, reason="Internal server error")

async def broadcast(event: dict, user_id: uuid.UUID = None):
    """
    Broadcast event to connected clients.
    If user_id is provided, only broadcast to that specific user.
    Otherwise, broadcast to all connected clients.
    """
    dead = []
    target_clients = authenticated_clients.items()
    
    if user_id:
        target_clients = [(ws, uid) for ws, uid in authenticated_clients.items() if uid == user_id]
    
    for ws, uid in list(target_clients):
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
            
    # Clean up dead connections
    for ws in dead:
        authenticated_clients.pop(ws, None)
