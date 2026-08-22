import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.tables import StopActivity, Trip, TripStop, User


def get_stats(db: Session) -> dict:
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_trips = db.query(func.count(Trip.id)).filter(Trip.deleted_at.is_(None)).scalar() or 0
    total_stops = db.query(func.count(TripStop.id)).scalar() or 0
    total_activities = db.query(func.count(StopActivity.id)).scalar() or 0

    # 30-day trips-created time series
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    series_rows = db.execute(
        text(
            "SELECT DATE(created_at) AS date, COUNT(*) AS count "
            "FROM trips WHERE deleted_at IS NULL AND created_at >= :since "
            "GROUP BY DATE(created_at) ORDER BY date"
        ),
        {"since": thirty_days_ago},
    ).mappings().all()
    trips_created_30d = [{"date": str(r["date"]), "count": r["count"]} for r in series_rows]

    # Top cities by actual usage (COUNT over trip_stops)
    top_cities_rows = db.execute(
        text(
            "SELECT c.name, COUNT(*) AS count "
            "FROM trip_stops ts JOIN cities c ON c.id = ts.city_id "
            "GROUP BY c.name ORDER BY count DESC LIMIT 10"
        )
    ).mappings().all()
    top_cities = [{"name": r["name"], "count": r["count"]} for r in top_cities_rows]

    # Top activities by actual usage (COUNT over stop_activities)
    top_acts_rows = db.execute(
        text(
            "SELECT COALESCE(a.name, sa.custom_name, 'Custom') AS name, COUNT(*) AS count "
            "FROM stop_activities sa "
            "LEFT JOIN activities a ON a.id = sa.activity_id "
            "GROUP BY COALESCE(a.name, sa.custom_name, 'Custom') "
            "ORDER BY count DESC LIMIT 10"
        )
    ).mappings().all()
    top_activities = [{"name": r["name"], "count": r["count"]} for r in top_acts_rows]

    # Engagement: trips per active user
    active_users = (
        db.query(func.count(func.distinct(Trip.user_id)))
        .filter(Trip.deleted_at.is_(None))
        .scalar()
        or 0
    )
    trips_per_active = round(total_trips / max(active_users, 1), 2)

    return {
        "total_users": total_users,
        "total_trips": total_trips,
        "total_stops": total_stops,
        "total_activities": total_activities,
        "trips_created_30d": trips_created_30d,
        "top_cities": top_cities,
        "top_activities": top_activities,
        "engagement": {
            "total_users": total_users,
            "active_users": active_users,
            "trips_per_active_user": trips_per_active,
        },
    }


def list_users(
    db: Session,
    *,
    q: str | None = None,
    role: str | None = None,
    show_deleted: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[User], int]:
    query = db.query(User)
    if q:
        query = query.filter(User.full_name.ilike(f"%{q}%") | User.email.ilike(f"%{q}%"))
    if role:
        query = query.filter(User.role == role)
    if not show_deleted:
        query = query.filter(User.deleted_at.is_(None))

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return users, total


def update_user(db: Session, user_id: uuid.UUID, data: dict) -> User | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    for key, val in data.items():
        setattr(user, key, val)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user
