from uuid import UUID

from sqlalchemy.orm import Session

from app.models.tables import SavedDestination, User


def update_user(db: Session, user: User, *, full_name: str | None, home_city_id: int | None, avatar_path: str | None) -> User:
    if full_name is not None:
        user.full_name = full_name
    if home_city_id is not None:
        user.home_city_id = home_city_id
    if avatar_path is not None:
        user.avatar_path = avatar_path
    db.flush()
    return user


def list_saved_destinations(db: Session, user_id: UUID) -> list[SavedDestination]:
    return (
        db.query(SavedDestination)
        .filter(SavedDestination.user_id == user_id)
        .order_by(SavedDestination.saved_at.desc())
        .all()
    )


def add_saved_destination(db: Session, user_id: UUID, city_id: int) -> SavedDestination:
    existing = (
        db.query(SavedDestination)
        .filter(SavedDestination.user_id == user_id, SavedDestination.city_id == city_id)
        .first()
    )
    if existing:
        return existing
    saved = SavedDestination(user_id=user_id, city_id=city_id)
    db.add(saved)
    db.flush()
    return saved


def remove_saved_destination(db: Session, user_id: UUID, city_id: int) -> None:
    db.query(SavedDestination).filter(
        SavedDestination.user_id == user_id, SavedDestination.city_id == city_id
    ).delete()
