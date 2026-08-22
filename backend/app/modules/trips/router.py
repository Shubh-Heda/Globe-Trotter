import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.trips import service
from app.modules.trips.schemas import (
    TripCreate,
    TripDetailOut,
    TripListOut,
    TripOut,
    TripSummaryOut,
    TripUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["Trips"])


@router.get("/trips", response_model=TripListOut)
def list_trips(
    q: str | None = Query(None),
    status: str | None = Query(None),
    sort: str = Query("start_date"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = service.list_trips(
        db, user, q=q, status=status, sort=sort, limit=limit, offset=offset
    )
    return TripListOut(items=[TripSummaryOut(**row) for row in items], total=total)


@router.post("/trips", response_model=TripOut, status_code=201)
def create_trip(
    body: TripCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    trip = service.create_trip(db, user, body)
    return TripOut.model_validate(trip)


@router.get("/trips/{trip_id}", response_model=TripDetailOut)
def get_trip(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    detail = service.get_trip_detail(db, trip_id, user)
    return TripDetailOut(**detail)


@router.patch("/trips/{trip_id}", response_model=TripOut)
def update_trip(
    trip_id: uuid.UUID,
    body: TripUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    trip = service.update_trip(db, trip_id, user, body)
    return TripOut.model_validate(trip)


@router.delete("/trips/{trip_id}", status_code=204)
def delete_trip(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service.delete_trip(db, trip_id, user)
