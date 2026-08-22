import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import NotFound, translate_db_error
from app.models.tables import TripStop, User
from app.modules.activities import repository as repo
from app.modules.activities.schemas import ScheduledActivityCreate, ScheduledActivityUpdate
from app.modules.trips.repository import get_owned_trip


def _get_owned_stop(db: Session, stop_id: uuid.UUID, user: User) -> TripStop:
    stop = db.query(TripStop).filter(TripStop.id == stop_id).first()
    if not stop:
        raise NotFound("Stop not found.")
    get_owned_trip(db, stop.trip_id, user.id)
    return stop


def list_stop_activities(db: Session, stop_id: uuid.UUID, user: User):
    _get_owned_stop(db, stop_id, user)
    return repo.list_stop_activities(db, stop_id)


def create_activity(
    db: Session, stop_id: uuid.UUID, user: User, data: ScheduledActivityCreate
):
    _get_owned_stop(db, stop_id, user)
    try:
        return repo.create_activity(db, stop_id, data.model_dump(exclude_unset=False))
    except SQLAlchemyError as exc:
        db.rollback()
        raise translate_db_error(exc)


def update_activity(
    db: Session, activity_id: uuid.UUID, user: User, data: ScheduledActivityUpdate
):
    act = repo.get_activity(db, activity_id)
    if not act:
        raise NotFound("Activity not found.")
    stop = db.query(TripStop).filter(TripStop.id == act.trip_stop_id).first()
    if not stop:
        raise NotFound("Stop not found.")
    get_owned_trip(db, stop.trip_id, user.id)
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        return act
    try:
        return repo.update_activity(db, act, updates)
    except SQLAlchemyError as exc:
        db.rollback()
        raise translate_db_error(exc)


def delete_activity(db: Session, activity_id: uuid.UUID, user: User) -> None:
    act = repo.get_activity(db, activity_id)
    if not act:
        raise NotFound("Activity not found.")
    stop = db.query(TripStop).filter(TripStop.id == act.trip_stop_id).first()
    if not stop:
        raise NotFound("Stop not found.")
    get_owned_trip(db, stop.trip_id, user.id)
    repo.delete_activity(db, act)


def reorder_activities(
    db: Session, stop_id: uuid.UUID, user: User, scheduled_date, activity_ids: list[uuid.UUID]
) -> None:
    _get_owned_stop(db, stop_id, user)
    try:
        repo.reorder_activities(db, stop_id, scheduled_date, activity_ids)
    except SQLAlchemyError as exc:
        db.rollback()
        raise translate_db_error(exc)
