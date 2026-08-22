from sqlalchemy.orm import Session

from app.models.tables import User
from app.modules.dashboard import repository as repo


def get_dashboard(db: Session, user: User) -> dict:
    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
        },
        "recent_trips": repo.get_recent_trips(db, user.id),
        "recommended_cities": repo.get_recommended_cities(db),
        "budget_highlight": repo.get_budget_highlight(db, user.id),
    }
