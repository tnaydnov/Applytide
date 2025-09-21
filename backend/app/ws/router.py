from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Set
from ..db.session import get_db
from ..auth.tokens import decode_access
from ..db import models
import uuid

router = APIRouter(prefix="/api/ws", tags=["ws"])

# Store authenticated clients with their user IDs
authenticated_clients: dict[WebSocket, uuid.UUID] = {}

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
async def updates(
    ws: WebSocket, 
    token: str = Query(..., description="Access token for authentication"),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time updates. Requires authentication via token query parameter."""
    try:
        # Authenticate user before accepting connection
        user = await get_user_from_token(token, db)
        
        await ws.accept()
        authenticated_clients[ws] = user.id
        print(f"WebSocket connected for user {user.id}")
        
        try:
            while True:
                # Keep the socket alive; we don't expect client messages yet
                await ws.receive_text()
        except WebSocketDisconnect:
            print(f"WebSocket disconnected for user {user.id}")
        finally:
            authenticated_clients.pop(ws, None)
            
    except HTTPException:
        # Authentication failed - close connection
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
