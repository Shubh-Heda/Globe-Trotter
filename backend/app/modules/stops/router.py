import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.stops import service
from app.modules.stops.schemas import ReorderStopsBody, StopCreate, StopOut, StopUpdate

router = APIRouter(prefix="/api/v1", tags=["Stops"])


@router.get("/trips/{trip_id}/stops", response_model=list[StopOut])
def list_stops(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = service.list_stops(db, trip_id, user)
    return [StopOut(**r) for r in rows]


@router.post("/trips/{trip_id}/stops", response_model=StopOut, status_code=201)
def create_stop(
    trip_id: uuid.UUID,
    body: StopCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stop = service.create_stop(db, trip_id, user, body)
    return StopOut.model_validate(stop)


@router.patch("/stops/{stop_id}", response_model=StopOut)
def update_stop(
    stop_id: uuid.UUID,
    body: StopUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stop = service.update_stop(db, stop_id, user, body)
    return StopOut.model_validate(stop)


@router.delete("/stops/{stop_id}", status_code=204)
def delete_stop(
    stop_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service.delete_stop(db, stop_id, user)


@router.patch("/trips/{trip_id}/stops/order", status_code=204)
def reorder_stops(
    trip_id: uuid.UUID,
    body: ReorderStopsBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service.reorder_stops(db, trip_id, user, body.stop_ids)
