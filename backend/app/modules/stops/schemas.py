import uuid
from datetime import date

from app.core.schema_base import CamelModel


class StopCreate(CamelModel):
    city_id: int
    arrival_date: date
    departure_date: date
    sort_order: int = 0
    stay_cents: int = 0
    transport_in_cents: int = 0
    notes: str | None = None


class StopUpdate(CamelModel):
    city_id: int | None = None
    arrival_date: date | None = None
    departure_date: date | None = None
    stay_cents: int | None = None
    transport_in_cents: int | None = None
    notes: str | None = None


class StopOut(CamelModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    city_id: int
    arrival_date: date
    departure_date: date
    sort_order: int
    stay_cents: int
    transport_in_cents: int
    notes: str | None = None
    city_name: str | None = None


class ReorderStopsBody(CamelModel):
    stop_ids: list[uuid.UUID]
