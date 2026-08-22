import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.modules.activities.schemas import ScheduledActivityOut
from app.modules.stops.schemas import StopOut
from app.modules.trips.schemas import TripOut
from app.models.tables import User
from app.modules.chat import service
from app.modules.chat.schemas import (
    ActionResult,
    ChatMessageOut,
    SendMessageRequest,
    SessionListOut,
    SessionOut,
    TurnResult,
)

router = APIRouter(prefix="/api/v1", tags=["Chat"])


def _turn_result(session, messages) -> TurnResult:
    return TurnResult(
        session=SessionOut.model_validate(session),
        messages=[ChatMessageOut.model_validate(m) for m in messages],
    )


@router.post("/chat/sessions", response_model=TurnResult, status_code=201)
def start_session(
    body: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session, messages = service.start_session(db, user, body.content)
    return _turn_result(session, messages)


@router.get("/chat/sessions", response_model=SessionListOut)
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sessions = service.list_sessions(db, user)
    return SessionListOut(items=[SessionOut.model_validate(s) for s in sessions])


@router.get("/chat/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def get_messages(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    messages = service.get_messages(db, user, session_id)
    return [ChatMessageOut.model_validate(m) for m in messages]


@router.post("/chat/sessions/{session_id}/messages", response_model=TurnResult)
def send_message(
    session_id: uuid.UUID,
    body: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session, messages = service.send_message(db, user, session_id, body.content)
    return _turn_result(session, messages)


@router.post("/chat/messages/{message_id}/accept", response_model=ActionResult)
def accept_action(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = service.accept_action(db, user, message_id)
    return ActionResult(
        message=ChatMessageOut.model_validate(result["message"]),
        trip=TripOut.model_validate(result["trip"]) if result["trip"] else None,
        stop=StopOut.model_validate(result["stop"]) if result["stop"] else None,
        activity=ScheduledActivityOut.model_validate(result["activity"]) if result["activity"] else None,
    )


@router.post("/chat/messages/{message_id}/reject", response_model=ChatMessageOut)
def reject_action(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    message = service.reject_action(db, user, message_id)
    return ChatMessageOut.model_validate(message)
