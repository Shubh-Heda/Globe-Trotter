import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.expenses import service
from app.modules.expenses.schemas import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/api/v1", tags=["Expenses"])


@router.get("/trips/{trip_id}/expenses", response_model=list[ExpenseOut])
def list_expenses(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exps = service.list_expenses(db, trip_id, user)
    return [ExpenseOut.model_validate(e) for e in exps]


@router.post("/trips/{trip_id}/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(
    trip_id: uuid.UUID,
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exp = service.create_expense(db, trip_id, user, body)
    return ExpenseOut.model_validate(exp)


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service.delete_expense(db, expense_id, user)
