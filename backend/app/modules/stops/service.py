import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import NotFound, ValidationFailed, translate_db_error
from app.models.tables import User
from app.modules.stops import repository as repo
from app.modules.stops.schemas import StopCreate, StopUpdate
from app.modules.trips.repository import get_owned_trip


def list_stops(db: Session, trip_id: uuid.UUID, user: User) -> list[dict]:
    get_owned_trip(db, trip_id, user.id)  # ownership check
    return repo.list_stops(db, trip_id)


def create_stop(db: Session, trip_id: uuid.UUID, user: User, data: StopCreate):
    get_owned_trip(db, trip_id, user.id)
    try:
        return repo.create_stop(db, trip_id, data.model_dump(exclude_unset=False))
    except SQLAlchemyError as exc:
        db.rollback()
        raise translate_db_error(exc)


def update_stop(db: Session, stop_id: uuid.UUID, user: User, data: StopUpdate):
    stop = repo.get_stop(db, stop_id)
    if not stop:
        raise NotFound("Stop not found.")
    get_owned_trip(db, stop.trip_id, user.id)
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        return stop
    try:
        return repo.update_stop(db, stop, updates)
    except SQLAlchemyError as exc:
        db.rollback()
        raise translate_db_error(exc)


def delete_stop(db: Session, stop_id: uuid.UUID, user: User) -> None:
    stop = repo.get_stop(db, stop_id)
    if not stop:
        raise NotFound("Stop not found.")
    get_owned_trip(db, stop.trip_id, user.id)
    repo.delete_stop(db, stop)


def reorder_stops(
    db: Session, trip_id: uuid.UUID, user: User, stop_ids: list[uuid.UUID]
) -> None:
    get_owned_trip(db, trip_id, user.id)
    # Validate that the incoming ids are exactly the trip's current stop set
    current_ids = repo.get_stop_ids_for_trip(db, trip_id)
    incoming_ids = set(stop_ids)
    if incoming_ids != current_ids:
        raise ValidationFailed(
            "Stop IDs must match exactly the trip's current stops.",
            details=[{"field": "stopIds", "issue": "Mismatch with existing stops."}],
        )
    try:
        repo.reorder_stops(db, trip_id, stop_ids)
    except SQLAlchemyError as exc:
        db.rollback()
        raise translate_db_error(exc)
