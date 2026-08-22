import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.models.tables import ChatMessage, ChatSession


def create_session(db: Session, user_id: uuid.UUID) -> ChatSession:
    session = ChatSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_owned_session(db: Session, session_id: uuid.UUID, user_id: uuid.UUID) -> ChatSession:
    """Load a chat session that belongs to user_id. 404 for non-owners — never 403."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )
    if not session:
        raise NotFound("Conversation not found.")
    return session


def list_sessions(db: Session, user_id: uuid.UUID) -> list[ChatSession]:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


def set_session_trip(db: Session, session: ChatSession, trip_id: uuid.UUID) -> None:
    session.trip_id = trip_id
    session.updated_at = datetime.now(timezone.utc)
    db.commit()


def touch_session(db: Session, session: ChatSession) -> None:
    session.updated_at = datetime.now(timezone.utc)
    db.commit()


def append_message(
    db: Session,
    session_id: uuid.UUID,
    role: str,
    content: str | None,
    action_type: str | None = None,
    action_payload: dict | None = None,
    action_status: str | None = None,
) -> ChatMessage:
    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        action_type=action_type,
        action_payload=action_payload,
        action_status=action_status,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_messages(db: Session, session_id: uuid.UUID) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )


def get_owned_message(db: Session, message_id: uuid.UUID, user_id: uuid.UUID) -> ChatMessage:
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise NotFound("Message not found.")
    # Ownership is via the session, not the message directly.
    get_owned_session(db, message.session_id, user_id)
    return message


def update_action_status(db: Session, message: ChatMessage, status: str) -> ChatMessage:
    message.action_status = status
    db.commit()
    db.refresh(message)
    return message
