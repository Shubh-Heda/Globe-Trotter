from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Activity, ActivityCategory, City, Country


def search_cities(
    db: Session,
    *,
    q: str | None = None,
    country_id: int | None = None,
    region: str | None = None,
    sort: str = "popularity",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Return (rows-as-dicts, total_count) for city search."""
    base = (
        select(
            City.id,
            City.country_id,
            City.name,
            City.cost_index,
            City.popularity_score,
            City.image_path,
            Country.name.label("country_name"),
            Country.iso2.label("country_iso2"),
            Country.region.label("region"),
        )
        .join(Country, City.country_id == Country.id)
    )

    if q:
        base = base.where(City.name.ilike(f"%{q}%"))
    if country_id is not None:
        base = base.where(City.country_id == country_id)
    if region:
        base = base.where(Country.region.ilike(f"%{region}%"))

    # Count before pagination
    count_q = select(func.count()).select_from(base.subquery())
    total = db.execute(count_q).scalar() or 0

    # Sort
    if sort == "cost":
        base = base.order_by(City.cost_index.asc())
    else:
        base = base.order_by(City.popularity_score.desc())

    rows = db.execute(base.limit(limit).offset(offset)).mappings().all()
    return [dict(r) for r in rows], total


def get_city_activities(db: Session, city_id: int) -> list[dict]:
    """All catalogue activities for a given city."""
    stmt = (
        select(
            Activity.id,
            Activity.city_id,
            Activity.category_id,
            Activity.name,
            Activity.description,
            Activity.base_cost_cents,
            Activity.duration_minutes,
            Activity.image_path,
            ActivityCategory.name.label("category_name"),
        )
        .join(ActivityCategory, Activity.category_id == ActivityCategory.id)
        .where(Activity.city_id == city_id)
        .order_by(Activity.name)
    )
    rows = db.execute(stmt).mappings().all()
    return [dict(r) for r in rows]


def search_activities(
    db: Session,
    *,
    q: str | None = None,
    city_id: int | None = None,
    category_id: int | None = None,
    max_cost_cents: int | None = None,
    max_duration_minutes: int | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Search the activity catalogue with optional filters."""
    base = (
        select(
            Activity.id,
            Activity.city_id,
            Activity.category_id,
            Activity.name,
            Activity.description,
            Activity.base_cost_cents,
            Activity.duration_minutes,
            Activity.image_path,
            City.name.label("city_name"),
            ActivityCategory.name.label("category_name"),
        )
        .join(City, Activity.city_id == City.id)
        .join(ActivityCategory, Activity.category_id == ActivityCategory.id)
    )

    if q:
        base = base.where(Activity.name.ilike(f"%{q}%"))
    if city_id is not None:
        base = base.where(Activity.city_id == city_id)
    if category_id is not None:
        base = base.where(Activity.category_id == category_id)
    if max_cost_cents is not None:
        base = base.where(Activity.base_cost_cents <= max_cost_cents)
    if max_duration_minutes is not None:
        base = base.where(Activity.duration_minutes <= max_duration_minutes)

    count_q = select(func.count()).select_from(base.subquery())
    total = db.execute(count_q).scalar() or 0

    rows = (
        db.execute(base.order_by(Activity.name).limit(limit).offset(offset))
        .mappings()
        .all()
    )
    return [dict(r) for r in rows], total


def list_categories(db: Session) -> list[ActivityCategory]:
    """All activity categories, ordered by name."""
    return list(db.execute(select(ActivityCategory).order_by(ActivityCategory.name)).scalars().all())
