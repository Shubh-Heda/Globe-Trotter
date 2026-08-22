import uuid
from datetime import time as dt_time

from sqlalchemy.orm import Session

from app.models.tables import StopActivity, TripStop


def list_stop_activities(db: Session, stop_id: uuid.UUID) -> list[StopActivity]:
    return (
        db.query(StopActivity)
        .filter(StopActivity.trip_stop_id == stop_id)
        .order_by(StopActivity.scheduled_date, StopActivity.sort_order)
        .all()
    )


def create_activity(db: Session, stop_id: uuid.UUID, data: dict) -> StopActivity:
    # Parse start_time string to time object if provided
    start_time_val = data.pop("start_time", None)
    if start_time_val and isinstance(start_time_val, str):
        try:
            parts = start_time_val.split(":")
            start_time_val = dt_time(int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            start_time_val = None

    act = StopActivity(trip_stop_id=stop_id, start_time=start_time_val, **data)
    db.add(act)
    db.commit()
    db.refresh(act)
    return act


def get_activity(db: Session, activity_id: uuid.UUID) -> StopActivity | None:
    return db.query(StopActivity).filter(StopActivity.id == activity_id).first()


def get_stop_for_activity(db: Session, activity_id: uuid.UUID) -> TripStop | None:
    act = get_activity(db, activity_id)
    if not act:
        return None
    return db.query(TripStop).filter(TripStop.id == act.trip_stop_id).first()


def update_activity(db: Session, act: StopActivity, data: dict) -> StopActivity:
    for key, val in data.items():
        if val is not None:
            if key == "start_time" and isinstance(val, str):
                try:
                    parts = val.split(":")
                    val = dt_time(int(parts[0]), int(parts[1]))
                except (ValueError, IndexError):
                    val = None
            setattr(act, key, val)
    db.commit()
    db.refresh(act)
    return act


def delete_activity(db: Session, act: StopActivity) -> None:
    db.delete(act)
    db.commit()


def reorder_activities(
    db: Session, stop_id: uuid.UUID, scheduled_date, activity_ids: list[uuid.UUID]
) -> None:
    for i, aid in enumerate(activity_ids):
        db.query(StopActivity).filter(
            StopActivity.id == aid,
            StopActivity.trip_stop_id == stop_id,
            StopActivity.scheduled_date == scheduled_date,
        ).update({"sort_order": i})
    db.commit()
