from sqlalchemy.orm import Session

from app.modules.catalog import repository as repo


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
    limit = min(limit, 100)
    return repo.search_cities(
        db, q=q, country_id=country_id, region=region, sort=sort, limit=limit, offset=offset
    )


def get_city_activities(db: Session, city_id: int) -> list[dict]:
    return repo.get_city_activities(db, city_id)


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
    limit = min(limit, 100)
    return repo.search_activities(
        db,
        q=q,
        city_id=city_id,
        category_id=category_id,
        max_cost_cents=max_cost_cents,
        max_duration_minutes=max_duration_minutes,
        limit=limit,
        offset=offset,
    )


def list_categories(db: Session):
    return repo.list_categories(db)
