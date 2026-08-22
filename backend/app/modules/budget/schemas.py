import uuid
from datetime import date, time

from app.core.schema_base import CamelModel


# ── Budget ────────────────────────────────────────────────────────────

class BudgetOut(CamelModel):
    trip_id: uuid.UUID
    duration_days: int
    budget_cap_cents: int | None = None
    total_cents: int
    transport_cents: int
    stay_cents: int
    activity_cents: int
    meals_cents: int
    other_cents: int
    avg_per_day_cents: int


class DailyCostOut(CamelModel):
    trip_id: uuid.UUID
    on_date: date
    amount_cents: int
    over_cap: bool | None = None


class BudgetResponse(CamelModel):
    summary: BudgetOut
    daily_costs: list[DailyCostOut]


# ── Calendar ──────────────────────────────────────────────────────────

class CalendarActivityOut(CamelModel):
    id: uuid.UUID
    activity_id: int | None = None
    custom_name: str | None = None
    start_time: time | None = None
    duration_minutes: int | None = None
    cost_cents: int
    sort_order: int
    notes: str | None = None
    stop_id: uuid.UUID
    city_name: str | None = None
    trip_id: uuid.UUID | None = None
    trip_name: str | None = None


class CalendarDayOut(CamelModel):
    date: date
    activities: list[CalendarActivityOut]
