import uuid

from sqlalchemy.orm import Session

from app.core.errors import NotFound, ValidationFailed
from app.models.tables import Trip, User
from app.modules.sharing import repository as repo
from app.modules.sharing.schemas import VisibilityUpdate
from app.modules.trips.repository import get_owned_trip


def update_visibility(
    db: Session, trip_id: uuid.UUID, user: User, data: VisibilityUpdate
) -> Trip:
    trip = get_owned_trip(db, trip_id, user.id)
    if data.visibility not in ("PUBLIC", "PRIVATE"):
        raise ValidationFailed("Visibility must be PUBLIC or PRIVATE.")
    return repo.update_visibility(db, trip, data.visibility)


def get_public_trip(db: Session, slug: str) -> dict:
    result = repo.get_public_trip(db, slug)
    if not result:
        raise NotFound("Trip not found.")
    return result


def copy_trip(db: Session, slug: str, user: User) -> Trip:
    source = (
        db.query(Trip)
        .filter(
            Trip.share_slug == slug,
            Trip.visibility == "PUBLIC",
            Trip.deleted_at.is_(None),
        )
        .first()
    )
    if not source:
        raise NotFound("Trip not found.")
    return repo.copy_trip(db, source, user.id)
