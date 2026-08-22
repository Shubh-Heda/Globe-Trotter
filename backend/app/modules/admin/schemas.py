import uuid
from datetime import date

from app.core.schema_base import CamelModel


# ── Stats ─────────────────────────────────────────────────────────────

class TimeSeriesPoint(CamelModel):
    date: date
    count: int


class TopItem(CamelModel):
    name: str
    count: int


class EngagementStats(CamelModel):
    total_users: int
    active_users: int
    trips_per_active_user: float


class AdminStatsOut(CamelModel):
    total_users: int
    total_trips: int
    total_stops: int
    total_activities: int
    trips_created_30d: list[TimeSeriesPoint]
    top_cities: list[TopItem]
    top_activities: list[TopItem]
    engagement: EngagementStats


# ── User management ──────────────────────────────────────────────────

class AdminUserOut(CamelModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    created_at: str
    deleted_at: str | None = None


class AdminUserListOut(CamelModel):
    items: list[AdminUserOut]
    total: int


class AdminUserUpdate(CamelModel):
    role: str | None = None
    deleted_at: str | None = None  # ISO string or null to reactivate
