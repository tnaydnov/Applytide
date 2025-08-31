from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set

router = APIRouter(prefix="/ws", tags=["ws"])

clients: Set[WebSocket] = set()

@router.websocket("/updates")
async def updates(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    try:
        while True:
            # Keep the socket alive; we don't expect client messages yet
            await ws.receive_text()
    except WebSocketDisconnect:
        clients.discard(ws)

async def broadcast(event: dict):
    dead = []
    for ws in list(clients):
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)
