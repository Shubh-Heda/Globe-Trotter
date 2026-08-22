from uuid import UUID

from sqlalchemy.orm import Session

from app.models.tables import User
from app.modules.auth.schemas import UserOut
from app.modules.users import repository
from app.modules.users.schemas import SavedDestinationOut, UpdateMeRequest


def update_me(db: Session, user: User, payload: UpdateMeRequest) -> UserOut:
    updated = repository.update_user(
        db,
        user,
        full_name=payload.full_name,
        home_city_id=payload.home_city_id,
        avatar_path=payload.avatar_path,
    )
    db.commit()
    db.refresh(updated)
    return UserOut.model_validate(updated)


def list_saved_destinations(db: Session, user_id: UUID) -> list[SavedDestinationOut]:
    rows = repository.list_saved_destinations(db, user_id)
    return [SavedDestinationOut.model_validate(row) for row in rows]


def save_destination(db: Session, user_id: UUID, city_id: int) -> SavedDestinationOut:
    row = repository.add_saved_destination(db, user_id, city_id)
    db.commit()
    db.refresh(row)
    return SavedDestinationOut.model_validate(row)


def remove_saved_destination(db: Session, user_id: UUID, city_id: int) -> None:
    repository.remove_saved_destination(db, user_id, city_id)
    db.commit()
