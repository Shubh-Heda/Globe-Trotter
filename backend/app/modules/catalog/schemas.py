from app.core.schema_base import CamelModel


# ── Activity categories ──────────────────────────────────────────────

class ActivityCategoryOut(CamelModel):
    id: int
    name: str
    slug: str


# ── Cities ────────────────────────────────────────────────────────────

class CityOut(CamelModel):
    id: int
    country_id: int
    name: str
    cost_index: int
    popularity_score: int
    image_path: str | None = None
    country_name: str | None = None
    country_iso2: str | None = None
    region: str | None = None


class CityListOut(CamelModel):
    items: list[CityOut]
    total: int


# ── Activities (catalogue entries) ───────────────────────────────────

class ActivityOut(CamelModel):
    id: int
    city_id: int
    category_id: int
    name: str
    description: str | None = None
    base_cost_cents: int
    duration_minutes: int | None = None
    image_path: str | None = None
    city_name: str | None = None
    category_name: str | None = None


class ActivityListOut(CamelModel):
    items: list[ActivityOut]
    total: int
