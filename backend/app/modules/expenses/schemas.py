import uuid
from datetime import date

from app.core.schema_base import CamelModel


class ExpenseCreate(CamelModel):
    trip_stop_id: uuid.UUID | None = None
    category: str
    label: str
    amount_cents: int
    incurred_on: date | None = None


class ExpenseOut(CamelModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    trip_stop_id: uuid.UUID | None = None
    category: str
    label: str
    amount_cents: int
    incurred_on: date | None = None
