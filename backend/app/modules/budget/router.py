import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.budget import service
from app.modules.budget.schemas import BudgetResponse, CalendarDayOut

router = APIRouter(prefix="/api/v1", tags=["Budget"])


@router.get("/trips/{trip_id}/budget", response_model=BudgetResponse)
def get_budget(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.get_budget(db, trip_id, user)


@router.get("/trips/{trip_id}/calendar", response_model=list[CalendarDayOut])
def get_calendar(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    days = service.get_calendar(db, trip_id, user)
    return [CalendarDayOut(**d) for d in days]
