import uuid
from datetime import datetime

from pydantic import Field

from app.core.schema_base import CamelModel
from app.modules.activities.schemas import ScheduledActivityOut
from app.modules.stops.schemas import StopOut
from app.modules.trips.schemas import TripOut


class SendMessageRequest(CamelModel):
    content: str = Field(..., min_length=1, max_length=2000)


class ChatMessageOut(CamelModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str | None = None
    action_type: str | None = None
    action_payload: dict | None = None
    action_status: str | None = None
    created_at: datetime


class SessionOut(CamelModel):
    id: uuid.UUID
    trip_id: uuid.UUID | None = None
    title: str | None = None
    created_at: datetime
    updated_at: datetime


class SessionListOut(CamelModel):
    items: list[SessionOut]


class TurnResult(CamelModel):
    session: SessionOut
    messages: list[ChatMessageOut]


class ActionResult(CamelModel):
    message: ChatMessageOut
    trip: TripOut | None = None
    stop: StopOut | None = None
    activity: ScheduledActivityOut | None = None
