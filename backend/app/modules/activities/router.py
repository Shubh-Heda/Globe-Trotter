import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.activities import service
from app.modules.activities.schemas import (
    ReorderActivitiesBody,
    ScheduledActivityCreate,
    ScheduledActivityOut,
    ScheduledActivityUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["Scheduled Activities"])


@router.get("/stops/{stop_id}/activities", response_model=list[ScheduledActivityOut])
def list_activities(
    stop_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    acts = service.list_stop_activities(db, stop_id, user)
    return [ScheduledActivityOut.model_validate(a) for a in acts]


@router.post(
    "/stops/{stop_id}/activities", response_model=ScheduledActivityOut, status_code=201
)
def create_activity(
    stop_id: uuid.UUID,
    body: ScheduledActivityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    act = service.create_activity(db, stop_id, user, body)
    return ScheduledActivityOut.model_validate(act)


@router.patch("/scheduled-activities/{activity_id}", response_model=ScheduledActivityOut)
def update_activity(
    activity_id: uuid.UUID,
    body: ScheduledActivityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    act = service.update_activity(db, activity_id, user, body)
    return ScheduledActivityOut.model_validate(act)


@router.delete("/scheduled-activities/{activity_id}", status_code=204)
def delete_activity(
    activity_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service.delete_activity(db, activity_id, user)


@router.patch("/stops/{stop_id}/activities/order", status_code=204)
def reorder_activities(
    stop_id: uuid.UUID,
    body: ReorderActivitiesBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service.reorder_activities(db, stop_id, user, body.scheduled_date, body.activity_ids)
