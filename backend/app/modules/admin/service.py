import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.modules.admin import repository as repo
from app.modules.admin.schemas import AdminUserUpdate


def get_stats(db: Session) -> dict:
    return repo.get_stats(db)


def list_users(
    db: Session,
    *,
    q: str | None = None,
    role: str | None = None,
    show_deleted: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list, int]:
    limit = min(limit, 100)
    return repo.list_users(db, q=q, role=role, show_deleted=show_deleted, limit=limit, offset=offset)


def update_user(db: Session, user_id: uuid.UUID, data: AdminUserUpdate) -> dict:
    updates = data.model_dump(exclude_unset=True)
    # Handle deleted_at: null means reactivate, ISO string means soft-delete
    if "deleted_at" in updates:
        if updates["deleted_at"] is None:
            pass  # reactivate — set deleted_at = None
        else:
            updates["deleted_at"] = datetime.now(timezone.utc)

    user = repo.update_user(db, user_id, updates)
    if not user:
        raise NotFound("User not found.")
    return user
