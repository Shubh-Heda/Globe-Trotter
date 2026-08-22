import uuid

from sqlalchemy.orm import Session

from app.models.tables import User
from app.modules.trips import repository as repo
from app.modules.trips.schemas import TripCreate, TripUpdate


def list_trips(
    db: Session,
    user: User,
    *,
    q: str | None = None,
    status: str | None = None,
    sort: str = "start_date",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    limit = min(limit, 100)
    return repo.list_trips(
        db, user.id, q=q, status=status, sort=sort, limit=limit, offset=offset
    )


def get_trip_detail(db: Session, trip_id: uuid.UUID, user: User) -> dict:
    trip = repo.get_owned_trip(db, trip_id, user.id)
    return repo.get_trip_detail(db, trip)


def create_trip(db: Session, user: User, data: TripCreate):
    return repo.create_trip(db, user.id, data.model_dump(exclude_unset=False))


def update_trip(db: Session, trip_id: uuid.UUID, user: User, data: TripUpdate):
    trip = repo.get_owned_trip(db, trip_id, user.id)
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        return trip
    return repo.update_trip(db, trip, updates)


def delete_trip(db: Session, trip_id: uuid.UUID, user: User) -> None:
    trip = repo.get_owned_trip(db, trip_id, user.id)
    repo.soft_delete_trip(db, trip)
