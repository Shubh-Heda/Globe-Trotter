import uuid
from datetime import date

from app.core.schema_base import CamelModel


class DashboardUserOut(CamelModel):
    id: uuid.UUID
    full_name: str
    email: str


class DashboardTripOut(CamelModel):
    id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    cover_image_path: str | None = None
    status: str
    stop_count: int
    total_cents: int


class DashboardCityOut(CamelModel):
    id: int
    name: str
    country_name: str
    popularity_score: int
    cost_index: int
    image_path: str | None = None


class BudgetHighlightOut(CamelModel):
    trip_id: uuid.UUID
    trip_name: str
    total_cents: int
    budget_cap_cents: int | None = None


class DashboardOut(CamelModel):
    user: DashboardUserOut
    recent_trips: list[DashboardTripOut]
    recommended_cities: list[DashboardCityOut]
    budget_highlight: BudgetHighlightOut | None = None
