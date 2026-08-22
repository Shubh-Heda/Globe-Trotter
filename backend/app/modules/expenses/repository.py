import uuid

from sqlalchemy.orm import Session

from app.models.tables import TripExpense


def list_expenses(db: Session, trip_id: uuid.UUID) -> list[TripExpense]:
    return (
        db.query(TripExpense)
        .filter(TripExpense.trip_id == trip_id)
        .order_by(TripExpense.category, TripExpense.label)
        .all()
    )


def create_expense(db: Session, trip_id: uuid.UUID, data: dict) -> TripExpense:
    exp = TripExpense(trip_id=trip_id, **data)
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


def get_expense(db: Session, expense_id: uuid.UUID) -> TripExpense | None:
    return db.query(TripExpense).filter(TripExpense.id == expense_id).first()


def delete_expense(db: Session, exp: TripExpense) -> None:
    db.delete(exp)
    db.commit()
