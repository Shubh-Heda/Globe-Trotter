from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.catalog import service
from app.modules.catalog.schemas import (
    ActivityCategoryOut,
    ActivityListOut,
    ActivityOut,
    CityListOut,
    CityOut,
)

router = APIRouter(prefix="/api/v1", tags=["Catalog"])


@router.get("/cities", response_model=CityListOut)
def list_cities(
    q: str | None = Query(None),
    country_id: int | None = Query(None, alias="countryId"),
    region: str | None = Query(None),
    sort: str = Query("popularity", pattern="^(cost|popularity)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = service.search_cities(
        db, q=q, country_id=country_id, region=region, sort=sort, limit=limit, offset=offset
    )
    return CityListOut(items=[CityOut(**row) for row in items], total=total)


@router.get("/cities/{city_id}/activities", response_model=list[ActivityOut])
def city_activities(city_id: int, db: Session = Depends(get_db)):
    rows = service.get_city_activities(db, city_id)
    return [ActivityOut(**row) for row in rows]


@router.get("/activities", response_model=ActivityListOut)
def list_activities(
    q: str | None = Query(None),
    city_id: int | None = Query(None, alias="cityId"),
    category_id: int | None = Query(None, alias="categoryId"),
    max_cost_cents: int | None = Query(None, alias="maxCostCents"),
    max_duration_minutes: int | None = Query(None, alias="maxDurationMinutes"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = service.search_activities(
        db,
        q=q,
        city_id=city_id,
        category_id=category_id,
        max_cost_cents=max_cost_cents,
        max_duration_minutes=max_duration_minutes,
        limit=limit,
        offset=offset,
    )
    return ActivityListOut(items=[ActivityOut(**row) for row in items], total=total)


@router.get("/activity-categories", response_model=list[ActivityCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    cats = service.list_categories(db)
    return [ActivityCategoryOut.model_validate(c) for c in cats]
