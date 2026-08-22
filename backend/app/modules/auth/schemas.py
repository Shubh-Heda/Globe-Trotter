import re
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.core.schema_base import CamelModel


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str = Field(..., min_length=1, max_length=80)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, value: str) -> str:
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one number.")
        return value


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class UserOut(CamelModel):
    id: UUID
    email: str
    full_name: str
    home_city_id: int | None = None
    avatar_path: str | None = None
    role: str


class TokenResponse(CamelModel):
    token: str
    user: UserOut
