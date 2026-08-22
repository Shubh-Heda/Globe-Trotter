import uuid
from datetime import date, datetime, time

from pydantic import Field, field_validator, model_validator

from app.core.schema_base import CamelModel

# Mirrors the CHECK constraints in migrations/001_init.sql so bad input is
# rejected as a readable 400 here, instead of round-tripping to Postgres and
# surfacing as an unhandled IntegrityError.
_MAX_TRIP_SPAN_DAYS = 365


def _validate_span(start: date, end: date) -> None:
    if end < start:
        raise ValueError("End date must be on or after the start date.")
    if (end - start).days > _MAX_TRIP_SPAN_DAYS:
        raise ValueError(f"Trips can span at most {_MAX_TRIP_SPAN_DAYS} days.")


# ── Input schemas ─────────────────────────────────────────────────────

class TripCreate(CamelModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(None, max_length=2000)
    start_date: date
    end_date: date
    cover_image_path: str | None = None
    currency_code: str = Field("INR", min_length=3, max_length=3)
    budget_cap_cents: int | None = Field(None, gt=0)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Trip name cannot be blank.")
        return value

    @model_validator(mode="after")
    def _check_span(self) -> "TripCreate":
        _validate_span(self.start_date, self.end_date)
        return self


class TripUpdate(CamelModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = Field(None, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None
    cover_image_path: str | None = None
    currency_code: str | None = Field(None, min_length=3, max_length=3)
    budget_cap_cents: int | None = Field(None, gt=0)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Trip name cannot be blank.")
        return value

    @model_validator(mode="after")
    def _check_span(self) -> "TripUpdate":
        # Only checkable when both ends are supplied; a partial update that
        # would invert the range is still caught by the DB CHECK constraint.
        if self.start_date is not None and self.end_date is not None:
            _validate_span(self.start_date, self.end_date)
        return self


# ── Output schemas ────────────────────────────────────────────────────

class StopActivityBrief(CamelModel):
    id: uuid.UUID
    activity_id: int | None = None
    custom_name: str | None = None
    scheduled_date: date
    start_time: time | None = None
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
    created_at: datetime
    updated_at: datetime


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
    created_at: datetime
    status: str
    stop_count: int
    total_cents: int


class TripListOut(CamelModel):
    items: list[TripSummaryOut]
    total: int


class TripDetailOut(TripOut):
    stops: list[TripStopBrief] = []
