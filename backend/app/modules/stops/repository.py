import uuid
from datetime import datetime, timezone

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.tables import City, TripStop


def list_stops(db: Session, trip_id: uuid.UUID) -> list[dict]:
    stops = (
        db.query(TripStop, City.name.label("city_name"))
        .join(City, TripStop.city_id == City.id)
        .filter(TripStop.trip_id == trip_id)
        .order_by(TripStop.sort_order)
        .all()
    )
    result = []
    for stop, city_name in stops:
        d = {
            "id": stop.id,
            "trip_id": stop.trip_id,
            "city_id": stop.city_id,
            "arrival_date": stop.arrival_date,
            "departure_date": stop.departure_date,
            "sort_order": stop.sort_order,
            "stay_cents": stop.stay_cents,
            "transport_in_cents": stop.transport_in_cents,
            "notes": stop.notes,
            "city_name": city_name,
        }
        result.append(d)
    return result


def create_stop(db: Session, trip_id: uuid.UUID, data: dict) -> TripStop:
    # sort_order is unique per trip. When the caller doesn't pin a position,
    # append to the end rather than defaulting to 0 and colliding with the
    # trip's existing first stop.
    if not data.get("sort_order"):
        highest = (
            db.query(func.max(TripStop.sort_order))
            .filter(TripStop.trip_id == trip_id)
            .scalar()
        )
        data = {**data, "sort_order": 0 if highest is None else highest + 1}
    stop = TripStop(trip_id=trip_id, **data)
    db.add(stop)
    db.commit()
    db.refresh(stop)
    return stop


def get_stop(db: Session, stop_id: uuid.UUID) -> TripStop | None:
    return db.query(TripStop).filter(TripStop.id == stop_id).first()


def update_stop(db: Session, stop: TripStop, data: dict) -> TripStop:
    for key, val in data.items():
        if val is not None:
            setattr(stop, key, val)
    db.commit()
    db.refresh(stop)
    return stop


def delete_stop(db: Session, stop: TripStop) -> None:
    db.delete(stop)
    db.commit()


def reorder_stops(db: Session, trip_id: uuid.UUID, stop_ids: list[uuid.UUID]) -> None:
    """Reorder stops by writing new sort_order values in one transaction.
    The DEFERRABLE INITIALLY DEFERRED constraint avoids uniqueness conflicts mid-tx."""
    db.execute(text("SET CONSTRAINTS stop_order_uq DEFERRED"))
    for i, sid in enumerate(stop_ids):
        db.query(TripStop).filter(
            TripStop.id == sid, TripStop.trip_id == trip_id
        ).update({"sort_order": i})
    db.commit()


def get_stop_ids_for_trip(db: Session, trip_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.query(TripStop.id).filter(TripStop.trip_id == trip_id).all()
    return {r[0] for r in rows}
