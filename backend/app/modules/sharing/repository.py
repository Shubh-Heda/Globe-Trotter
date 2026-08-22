import secrets
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.models.tables import (
    City,
    StopActivity,
    Trip,
    TripExpense,
    TripStop,
)


def update_visibility(db: Session, trip: Trip, visibility: str) -> Trip:
    """Set visibility. Issues share_slug on first publish; retains slug on unpublish."""
    trip.visibility = visibility
    if visibility == "PUBLIC" and not trip.share_slug:
        # Generate slug, retry once on collision
        for _ in range(2):
            slug = secrets.token_urlsafe(6)
            trip.share_slug = slug
            try:
                db.flush()
                break
            except IntegrityError:
                db.rollback()
                continue
    trip.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(trip)
    return trip


def get_public_trip(db: Session, slug: str) -> dict | None:
    """Load a published trip by share_slug, with stops and activities."""
    trip = (
        db.query(Trip)
        .filter(
            Trip.share_slug == slug,
            Trip.visibility == "PUBLIC",
            Trip.deleted_at.is_(None),
        )
        .first()
    )
    if not trip:
        return None

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

    acts_by_stop: dict[uuid.UUID, list] = {}
    for a in activities:
        acts_by_stop.setdefault(a.trip_stop_id, []).append(a)

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
            "city_name": city_names.get(s.city_id),
            "arrival_date": s.arrival_date,
            "departure_date": s.departure_date,
            "sort_order": s.sort_order,
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
                }
                for a in stop_acts
            ],
        })

    return {
        "id": trip.id,
        "name": trip.name,
        "description": trip.description,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "cover_image_path": trip.cover_image_path,
        "currency_code": trip.currency_code,
        "duration_days": trip.duration_days,
        "share_slug": trip.share_slug,
        "stops": stop_dicts,
    }


def copy_trip(db: Session, source_trip: Trip, user_id: uuid.UUID) -> Trip:
    """Deep-copy a trip with date rebasing. One transaction.

    Algorithm from PLAN.md §4:
    - offset = max(0, today - source.start_date)
    - Rebase all dates by offset
    - Copy stops, activities, expenses
    """
    today = date.today()
    offset_days = max(0, (today - source_trip.start_date).days)
    offset = timedelta(days=offset_days)

    new_trip = Trip(
        user_id=user_id,
        name=f"Copy of {source_trip.name}",
        description=source_trip.description,
        start_date=source_trip.start_date + offset,
        end_date=source_trip.end_date + offset,
        cover_image_path=source_trip.cover_image_path,
        visibility="PRIVATE",
        share_slug=None,
        currency_code=source_trip.currency_code,
        budget_cap_cents=source_trip.budget_cap_cents,
        copied_from_trip_id=source_trip.id,
    )
    db.add(new_trip)
    db.flush()  # get new_trip.id

    # Copy stops
    old_stops = (
        db.query(TripStop)
        .filter(TripStop.trip_id == source_trip.id)
        .order_by(TripStop.sort_order)
        .all()
    )

    old_to_new_stop: dict[uuid.UUID, uuid.UUID] = {}
    for s in old_stops:
        new_stop = TripStop(
            trip_id=new_trip.id,
            city_id=s.city_id,
            arrival_date=s.arrival_date + offset,
            departure_date=s.departure_date + offset,
            sort_order=s.sort_order,
            stay_cents=s.stay_cents,
            transport_in_cents=s.transport_in_cents,
            notes=s.notes,
        )
        db.add(new_stop)
        db.flush()
        old_to_new_stop[s.id] = new_stop.id

    # Copy activities
    old_stop_ids = list(old_to_new_stop.keys())
    if old_stop_ids:
        old_acts = (
            db.query(StopActivity)
            .filter(StopActivity.trip_stop_id.in_(old_stop_ids))
            .all()
        )
        for a in old_acts:
            new_act = StopActivity(
                trip_stop_id=old_to_new_stop[a.trip_stop_id],
                activity_id=a.activity_id,
                custom_name=a.custom_name,
                scheduled_date=a.scheduled_date + offset,
                start_time=a.start_time,
                duration_minutes=a.duration_minutes,
                cost_cents=a.cost_cents,
                sort_order=a.sort_order,
                notes=a.notes,
            )
            db.add(new_act)

    # Copy expenses
    old_exps = db.query(TripExpense).filter(TripExpense.trip_id == source_trip.id).all()
    for e in old_exps:
        new_exp = TripExpense(
            trip_id=new_trip.id,
            trip_stop_id=old_to_new_stop.get(e.trip_stop_id) if e.trip_stop_id else None,
            category=e.category,
            label=e.label,
            amount_cents=e.amount_cents,
            incurred_on=e.incurred_on + offset if e.incurred_on else None,
        )
        db.add(new_exp)

    db.commit()
    db.refresh(new_trip)
    return new_trip
