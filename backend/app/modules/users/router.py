from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.modules.auth.schemas import UserOut
from app.modules.users import service
from app.modules.users.schemas import SavedDestinationOut, SaveDestinationRequest, UpdateMeRequest

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/users/me", response_model=UserOut)
def update_me(
    payload: UpdateMeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    return service.update_me(db, current_user, payload)


@router.get("/users/me/saved-destinations", response_model=list[SavedDestinationOut])
def list_saved_destinations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SavedDestinationOut]:
    return service.list_saved_destinations(db, current_user.id)


@router.post(
    "/users/me/saved-destinations",
    response_model=SavedDestinationOut,
    status_code=status.HTTP_201_CREATED,
)
def add_saved_destination(
    payload: SaveDestinationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavedDestinationOut:
    return service.save_destination(db, current_user.id, payload.city_id)


@router.delete("/users/me/saved-destinations/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_destination(
    city_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    service.remove_saved_destination(db, current_user.id, city_id)
