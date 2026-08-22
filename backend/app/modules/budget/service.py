import uuid

from sqlalchemy.orm import Session

from app.models.tables import User
from app.modules.budget import repository as repo
from app.modules.trips.repository import get_owned_trip


def get_budget(db: Session, trip_id: uuid.UUID, user: User) -> dict:
    get_owned_trip(db, trip_id, user.id)
    summary = repo.get_trip_budget(db, trip_id)
    daily_costs = repo.get_daily_costs(db, trip_id)
    return {
        "summary": summary or {
            "trip_id": trip_id,
            "duration_days": 0,
            "budget_cap_cents": None,
            "total_cents": 0,
            "transport_cents": 0,
            "stay_cents": 0,
            "activity_cents": 0,
            "meals_cents": 0,
            "other_cents": 0,
            "avg_per_day_cents": 0,
        },
        "daily_costs": daily_costs,
    }


def get_calendar(db: Session, trip_id: uuid.UUID, user: User) -> list[dict]:
    get_owned_trip(db, trip_id, user.id)
    return repo.get_calendar(db, trip_id)
