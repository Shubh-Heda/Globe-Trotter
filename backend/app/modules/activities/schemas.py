import uuid
from datetime import date, time

from app.core.schema_base import CamelModel


class ScheduledActivityCreate(CamelModel):
    activity_id: int | None = None
    custom_name: str | None = None
    scheduled_date: date
    start_time: str | None = None
    duration_minutes: int | None = None
    cost_cents: int = 0
    sort_order: int = 0
    notes: str | None = None


class ScheduledActivityUpdate(CamelModel):
    activity_id: int | None = None
    custom_name: str | None = None
    scheduled_date: date | None = None
    start_time: str | None = None
    duration_minutes: int | None = None
    cost_cents: int | None = None
    sort_order: int | None = None
    notes: str | None = None


class ScheduledActivityOut(CamelModel):
    id: uuid.UUID
    trip_stop_id: uuid.UUID
    activity_id: int | None = None
    custom_name: str | None = None
    scheduled_date: date
    start_time: time | None = None
    duration_minutes: int | None = None
    cost_cents: int
    sort_order: int
    notes: str | None = None


class ReorderActivitiesBody(CamelModel):
    scheduled_date: date
    activity_ids: list[uuid.UUID]
