import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.sharing import service
from app.modules.sharing.schemas import (
    CopyTripOut,
    PublicTripOut,
    VisibilityUpdate,
)
from app.modules.trips.schemas import TripOut

router = APIRouter(prefix="/api/v1", tags=["Sharing"])


@router.patch("/trips/{trip_id}/visibility", response_model=TripOut)
def update_visibility(
    trip_id: uuid.UUID,
    body: VisibilityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    trip = service.update_visibility(db, trip_id, user, body)
    return TripOut.model_validate(trip)


@router.get("/public/trips/{slug}", response_model=PublicTripOut)
def get_public_trip(slug: str, db: Session = Depends(get_db)):
    """No auth required."""
    return service.get_public_trip(db, slug)


@router.post("/public/trips/{slug}/copy", response_model=CopyTripOut, status_code=201)
def copy_trip(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    trip = service.copy_trip(db, slug, user)
    return CopyTripOut.model_validate(trip)
