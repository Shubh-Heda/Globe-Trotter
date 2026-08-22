import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_admin
from app.models.tables import User
from app.modules.admin import service
from app.modules.admin.schemas import (
    AdminStatsOut,
    AdminUserListOut,
    AdminUserOut,
    AdminUserUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["Admin"])


@router.get("/admin/stats", response_model=AdminStatsOut)
def get_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return service.get_stats(db)


@router.get("/admin/users", response_model=AdminUserListOut)
def list_users(
    q: str | None = Query(None),
    role: str | None = Query(None),
    show_deleted: bool = Query(False, alias="showDeleted"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    users, total = service.list_users(
        db, q=q, role=role, show_deleted=show_deleted, limit=limit, offset=offset
    )
    return AdminUserListOut(
        items=[AdminUserOut.model_validate(u) for u in users], total=total
    )


@router.patch("/admin/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = service.update_user(db, user_id, body)
    return AdminUserOut.model_validate(user)
