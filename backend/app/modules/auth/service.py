from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import InvalidCredentials, translate_integrity_error
from app.core.security import create_access_token, hash_password, verify_password
from app.models.tables import User
from app.modules.auth import repository
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut


def register(db: Session, payload: RegisterRequest) -> TokenResponse:
    password_hash = hash_password(payload.password)
    try:
        user = repository.create_user(
            db, email=payload.email, password_hash=password_hash, full_name=payload.full_name
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise translate_integrity_error(exc)
    db.refresh(user)
    return _token_response(user)


def login(db: Session, payload: LoginRequest) -> TokenResponse:
    user = repository.get_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise InvalidCredentials()
    return _token_response(user)


def _token_response(user: User) -> TokenResponse:
    token = create_access_token(user.id)
    return TokenResponse(token=token, user=UserOut.model_validate(user))
