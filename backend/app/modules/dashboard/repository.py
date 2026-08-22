import uuid

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.tables import City, Country


def get_recent_trips(db: Session, user_id: uuid.UUID, limit: int = 5) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT id, name, start_date, end_date, cover_image_path, status, stop_count, total_cents "
            "FROM v_trip_summary WHERE user_id = :uid "
            "ORDER BY start_date DESC LIMIT :lim"
        ),
        {"uid": user_id, "lim": limit},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_recommended_cities(db: Session, limit: int = 6) -> list[dict]:
    stmt = (
        select(
            City.id,
            City.name,
            Country.name.label("country_name"),
            City.popularity_score,
            City.cost_index,
            City.image_path,
        )
        .join(Country, City.country_id == Country.id)
        .order_by(City.popularity_score.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).mappings().all()
    return [dict(r) for r in rows]


def get_budget_highlight(db: Session, user_id: uuid.UUID) -> dict | None:
    """Budget highlight for the nearest upcoming or ongoing trip."""
    row = db.execute(
        text(
            "SELECT ts.id AS trip_id, ts.name AS trip_name, "
            "COALESCE(b.total_cents, 0) AS total_cents, "
            "ts.budget_cap_cents "
            "FROM v_trip_summary ts "
            "LEFT JOIN v_trip_budget b ON b.trip_id = ts.id "
            "WHERE ts.user_id = :uid AND ts.status IN ('UPCOMING', 'ONGOING') "
            "ORDER BY ts.start_date ASC LIMIT 1"
        ),
        {"uid": user_id},
    ).mappings().first()
    return dict(row) if row else None
