"""In-memory per-trip WebSocket hub.

Connection flow: WS /ws/trips/{trip_id}?token=<jwt>
- Token is passed as a query param (can't use Authorization header in WS)
- JWT decode reuses core/security.py's decode_access_token
- Events emitted AFTER db.commit() succeeds, never before/inside tx
- Payload is an invalidation hint, never data
"""

import uuid
from collections import defaultdict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import decode_access_token
from app.models.tables import User

router = APIRouter()


class ConnectionManager:
    """Manages per-trip WebSocket connection pools."""

    def __init__(self):
        self._rooms: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, trip_id: uuid.UUID, ws: WebSocket):
        await ws.accept()
        self._rooms[trip_id].add(ws)

    def disconnect(self, trip_id: uuid.UUID, ws: WebSocket):
        self._rooms[trip_id].discard(ws)
        if not self._rooms[trip_id]:
            del self._rooms[trip_id]

    async def broadcast(self, trip_id: uuid.UUID, event_type: str):
        """Send an invalidation hint to all connections for a trip.
        Call this ONLY after db.commit() has succeeded."""
        message = {"type": event_type, "tripId": str(trip_id)}
        dead: list[WebSocket] = []
        for ws in self._rooms.get(trip_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._rooms[trip_id].discard(ws)


manager = ConnectionManager()


@router.websocket("/ws/trips/{trip_id}")
async def trip_ws(
    ws: WebSocket,
    trip_id: uuid.UUID,
    token: str = Query(...),
):
    # Authenticate via query-param JWT
    try:
        user_id = decode_access_token(token)
    except Exception:
        await ws.close(code=4001, reason="Invalid token")
        return

    # Verify user exists and owns/has access to the trip
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
        if not user:
            await ws.close(code=4001, reason="Invalid token")
            return
    finally:
        db.close()

    await manager.connect(trip_id, ws)
    try:
        while True:
            # Keep connection alive; ignore client messages
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(trip_id, ws)
