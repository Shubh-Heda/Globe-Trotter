import uuid
from datetime import date

from app.core.schema_base import CamelModel


# ── Input schemas ─────────────────────────────────────────────────────

class TripCreate(CamelModel):
    name: str
    description: str | None = None
    start_date: date
    end_date: date
    cover_image_path: str | None = None
    currency_code: str = "INR"
    budget_cap_cents: int | None = None


class TripUpdate(CamelModel):
    name: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    cover_image_path: str | None = None
    currency_code: str | None = None
    budget_cap_cents: int | None = None


# ── Output schemas ────────────────────────────────────────────────────

class StopActivityBrief(CamelModel):
    id: uuid.UUID
    activity_id: int | None = None
    custom_name: str | None = None
    scheduled_date: date
    start_time: str | None = None
    duration_minutes: int | None = None
    cost_cents: int
    sort_order: int
    notes: str | None = None


class TripStopBrief(CamelModel):
    id: uuid.UUID
    city_id: int
    arrival_date: date
    departure_date: date
    sort_order: int
    stay_cents: int
    transport_in_cents: int
    notes: str | None = None
    city_name: str | None = None
    activities: list[StopActivityBrief] = []


class TripOut(CamelModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None = None
    start_date: date
    end_date: date
    cover_image_path: str | None = None
    visibility: str
    share_slug: str | None = None
    currency_code: str
    budget_cap_cents: int | None = None
    duration_days: int
    copied_from_trip_id: uuid.UUID | None = None
    created_at: str
    updated_at: str


class TripSummaryOut(CamelModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None = None
    start_date: date
    end_date: date
    cover_image_path: str | None = None
    visibility: str
    share_slug: str | None = None
    currency_code: str
    budget_cap_cents: int | None = None
    duration_days: int
    copied_from_trip_id: uuid.UUID | None = None
    created_at: str
    status: str
    stop_count: int
    total_cents: int


class TripListOut(CamelModel):
    items: list[TripSummaryOut]
    total: int


class TripDetailOut(TripOut):
    stops: list[TripStopBrief] = []
