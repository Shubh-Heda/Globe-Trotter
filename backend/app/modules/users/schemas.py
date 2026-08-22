from datetime import datetime

from app.core.schema_base import CamelModel
from app.modules.auth.schemas import UserOut

# Re-exported so other modules import users.schemas.UserOut consistently.
__all__ = ["UserOut", "UpdateMeRequest", "SavedDestinationOut", "SaveDestinationRequest"]


class UpdateMeRequest(CamelModel):
    full_name: str | None = None
    home_city_id: int | None = None
    avatar_path: str | None = None


class SavedDestinationOut(CamelModel):
    city_id: int
    saved_at: datetime


class SaveDestinationRequest(CamelModel):
    city_id: int
