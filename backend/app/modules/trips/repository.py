import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.models.tables import City, StopActivity, Trip, TripStop


def get_owned_trip(db: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> Trip:
    """Load a trip that belongs to user_id. Returns 404 for non-owners — never 403."""
    trip = db.query(Trip).filter(
        Trip.id == trip_id, Trip.user_id == user_id, Trip.deleted_at.is_(None)
    ).first()
    if not trip:
        raise NotFound("Trip not found.")
    return trip


def list_trips(
    db: Session,
    user_id: uuid.UUID,
    *,
    q: str | None = None,
    status: str | None = None,
    sort: str = "start_date",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """List trips from v_trip_summary for a user."""
    base = text(
        "SELECT * FROM v_trip_summary WHERE user_id = :uid"
    )
    params: dict = {"uid": user_id}

    filters = []
    if q:
        filters.append("name ILIKE :q")
        params["q"] = f"%{q}%"
    if status:
        filters.append("status = :status")
        params["status"] = status

    where_clause = (" AND " + " AND ".join(filters)) if filters else ""
    count_sql = text(f"SELECT count(*) FROM v_trip_summary WHERE user_id = :uid{where_clause}")
    total = db.execute(count_sql, params).scalar() or 0

    sort_col = "start_date DESC" if sort == "start_date" else "created_at DESC"
    data_sql = text(
        f"SELECT * FROM v_trip_summary WHERE user_id = :uid{where_clause} "
        f"ORDER BY {sort_col} LIMIT :lim OFFSET :off"
    )
    params["lim"] = limit
    params["off"] = offset
    rows = db.execute(data_sql, params).mappings().all()
    return [dict(r) for r in rows], total


def get_trip_detail(db: Session, trip: Trip) -> dict:
    """Trip + stops + activities in assembled dict form."""
    stops = (
        db.query(TripStop)
        .filter(TripStop.trip_id == trip.id)
        .order_by(TripStop.sort_order)
        .all()
    )

    stop_ids = [s.id for s in stops]
    activities = []
    if stop_ids:
        activities = (
            db.query(StopActivity)
            .filter(StopActivity.trip_stop_id.in_(stop_ids))
            .order_by(StopActivity.scheduled_date, StopActivity.sort_order)
            .all()
        )

    # Group activities by stop
    acts_by_stop: dict[uuid.UUID, list] = {}
    for a in activities:
        acts_by_stop.setdefault(a.trip_stop_id, []).append(a)

    # Look up city names
    city_ids = list({s.city_id for s in stops})
    city_names = {}
    if city_ids:
        cities = db.query(City.id, City.name).filter(City.id.in_(city_ids)).all()
        city_names = {c.id: c.name for c in cities}

    stop_dicts = []
    for s in stops:
        stop_acts = acts_by_stop.get(s.id, [])
        stop_dicts.append({
            "id": s.id,
            "city_id": s.city_id,
            "arrival_date": s.arrival_date,
            "departure_date": s.departure_date,
            "sort_order": s.sort_order,
            "stay_cents": s.stay_cents,
            "transport_in_cents": s.transport_in_cents,
            "notes": s.notes,
            "city_name": city_names.get(s.city_id),
            "activities": [
                {
                    "id": a.id,
                    "activity_id": a.activity_id,
                    "custom_name": a.custom_name,
                    "scheduled_date": a.scheduled_date,
                    "start_time": str(a.start_time) if a.start_time else None,
                    "duration_minutes": a.duration_minutes,
                    "cost_cents": a.cost_cents,
                    "sort_order": a.sort_order,
                    "notes": a.notes,
                }
                for a in stop_acts
            ],
        })

    return {
        "id": trip.id,
        "user_id": trip.user_id,
        "name": trip.name,
        "description": trip.description,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "cover_image_path": trip.cover_image_path,
        "visibility": trip.visibility,
        "share_slug": trip.share_slug,
        "currency_code": trip.currency_code,
        "budget_cap_cents": trip.budget_cap_cents,
        "duration_days": trip.duration_days,
        "copied_from_trip_id": trip.copied_from_trip_id,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
        "updated_at": trip.updated_at.isoformat() if trip.updated_at else None,
        "stops": stop_dicts,
    }


def create_trip(db: Session, user_id: uuid.UUID, data: dict) -> Trip:
    trip = Trip(user_id=user_id, **data)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def update_trip(db: Session, trip: Trip, data: dict) -> Trip:
    for key, val in data.items():
        if val is not None:
            setattr(trip, key, val)
    trip.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(trip)
    return trip


def soft_delete_trip(db: Session, trip: Trip) -> None:
    trip.deleted_at = datetime.now(timezone.utc)
    db.commit()
