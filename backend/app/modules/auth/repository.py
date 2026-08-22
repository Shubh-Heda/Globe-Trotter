from sqlalchemy.orm import Session

from app.models.tables import User


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()


def create_user(db: Session, *, email: str, password_hash: str, full_name: str) -> User:
    user = User(email=email, password_hash=password_hash, full_name=full_name)
    db.add(user)
    db.flush()  # assigns user.id without committing — caller owns the transaction boundary
    return user
