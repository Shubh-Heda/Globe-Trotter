import uuid
from collections import defaultdict
from datetime import timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.tables import City, StopActivity, Trip, TripStop


def get_trip_budget(db: Session, trip_id: uuid.UUID) -> dict | None:
    """One query against v_trip_budget — zero arithmetic in Python."""
    row = db.execute(
        text("SELECT * FROM v_trip_budget WHERE trip_id = :id"),
        {"id": trip_id},
    ).mappings().first()
    return dict(row) if row else None


def get_daily_costs(db: Session, trip_id: uuid.UUID) -> list[dict]:
    """One query against v_trip_daily_cost."""
    rows = db.execute(
        text("SELECT * FROM v_trip_daily_cost WHERE trip_id = :id ORDER BY on_date"),
        {"id": trip_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_calendar(db: Session, trip_id: uuid.UUID) -> list[dict]:
    """Day-indexed grid of scheduled activities for a trip."""
    stops = (
        db.query(TripStop)
        .filter(TripStop.trip_id == trip_id)
        .order_by(TripStop.sort_order)
        .all()
    )

    if not stops:
        return []

    stop_ids = [s.id for s in stops]
    # Look up city names
    city_ids = list({s.city_id for s in stops})
    city_names = {}
    if city_ids:
        cities = db.query(City.id, City.name).filter(City.id.in_(city_ids)).all()
        city_names = {c.id: c.name for c in cities}

    stop_city_map = {s.id: city_names.get(s.city_id) for s in stops}

    # Seed every day a stop actually covers, so a stop with no activities
    # yet still shows up on the calendar. departure_date is exclusive.
    by_date: dict[str, list] = defaultdict(list)
    for s in stops:
        day = s.arrival_date
        while day < s.departure_date:
            by_date[str(day)]
            day += timedelta(days=1)

    activities = (
        db.query(StopActivity)
        .filter(StopActivity.trip_stop_id.in_(stop_ids))
        .order_by(StopActivity.scheduled_date, StopActivity.sort_order)
        .all()
    )

    for a in activities:
        by_date[str(a.scheduled_date)].append({
            "id": a.id,
            "activity_id": a.activity_id,
            "custom_name": a.custom_name,
            "start_time": str(a.start_time) if a.start_time else None,
            "duration_minutes": a.duration_minutes,
            "cost_cents": a.cost_cents,
            "sort_order": a.sort_order,
            "notes": a.notes,
            "stop_id": a.trip_stop_id,
            "city_name": stop_city_map.get(a.trip_stop_id),
        })

    return [{"date": d, "activities": acts} for d, acts in sorted(by_date.items())]


def get_calendar_for_user(db: Session, user_id: uuid.UUID) -> list[dict]:
    """Day-indexed grid of scheduled activities across every trip the user owns."""
    stop_rows = (
        db.query(TripStop, Trip.name)
        .join(Trip, Trip.id == TripStop.trip_id)
        .filter(Trip.user_id == user_id, Trip.deleted_at.is_(None))
        .order_by(Trip.start_date, TripStop.sort_order)
        .all()
    )

    if not stop_rows:
        return []

    stops = [s for s, _ in stop_rows]
    stop_trip_name = {s.id: name for s, name in stop_rows}
    stop_trip_id = {s.id: s.trip_id for s in stops}

    city_ids = list({s.city_id for s in stops})
    city_names = {}
    if city_ids:
        cities = db.query(City.id, City.name).filter(City.id.in_(city_ids)).all()
        city_names = {c.id: c.name for c in cities}

    stop_city_map = {s.id: city_names.get(s.city_id) for s in stops}

    by_date: dict[str, list] = defaultdict(list)
    for s in stops:
        day = s.arrival_date
        while day < s.departure_date:
            by_date[str(day)]
            day += timedelta(days=1)

    stop_ids = [s.id for s in stops]
    activities = (
        db.query(StopActivity)
        .filter(StopActivity.trip_stop_id.in_(stop_ids))
        .order_by(StopActivity.scheduled_date, StopActivity.sort_order)
        .all()
    )

    for a in activities:
        by_date[str(a.scheduled_date)].append({
            "id": a.id,
            "activity_id": a.activity_id,
            "custom_name": a.custom_name,
            "start_time": str(a.start_time) if a.start_time else None,
            "duration_minutes": a.duration_minutes,
            "cost_cents": a.cost_cents,
            "sort_order": a.sort_order,
            "notes": a.notes,
            "stop_id": a.trip_stop_id,
            "city_name": stop_city_map.get(a.trip_stop_id),
            "trip_id": stop_trip_id.get(a.trip_stop_id),
            "trip_name": stop_trip_name.get(a.trip_stop_id),
        })

    return [{"date": d, "activities": acts} for d, acts in sorted(by_date.items())]
