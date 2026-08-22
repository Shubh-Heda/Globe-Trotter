import uuid

from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.models.tables import User
from app.modules.expenses import repository as repo
from app.modules.expenses.schemas import ExpenseCreate
from app.modules.trips.repository import get_owned_trip


def list_expenses(db: Session, trip_id: uuid.UUID, user: User):
    get_owned_trip(db, trip_id, user.id)
    return repo.list_expenses(db, trip_id)


def create_expense(db: Session, trip_id: uuid.UUID, user: User, data: ExpenseCreate):
    get_owned_trip(db, trip_id, user.id)
    return repo.create_expense(db, trip_id, data.model_dump(exclude_unset=False))


def delete_expense(db: Session, expense_id: uuid.UUID, user: User) -> None:
    exp = repo.get_expense(db, expense_id)
    if not exp:
        raise NotFound("Expense not found.")
    get_owned_trip(db, exp.trip_id, user.id)
    repo.delete_expense(db, exp)
