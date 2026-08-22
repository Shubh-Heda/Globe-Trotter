import uuid
from datetime import date, time

from app.core.schema_base import CamelModel


class VisibilityUpdate(CamelModel):
    visibility: str  # "PUBLIC" or "PRIVATE"


class PublicStopActivityOut(CamelModel):
    id: uuid.UUID
    activity_id: int | None = None
    custom_name: str | None = None
    scheduled_date: date
    start_time: time | None = None
    duration_minutes: int | None = None
    cost_cents: int
    sort_order: int


class PublicStopOut(CamelModel):
    id: uuid.UUID
    city_id: int
    city_name: str | None = None
    arrival_date: date
    departure_date: date
    sort_order: int
    activities: list[PublicStopActivityOut] = []


class PublicTripOut(CamelModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    start_date: date
    end_date: date
    cover_image_path: str | None = None
    currency_code: str
    duration_days: int
    share_slug: str
    stops: list[PublicStopOut] = []


class CopyTripOut(CamelModel):
    id: uuid.UUID
    name: str
    start_date: date
    end_date: date
