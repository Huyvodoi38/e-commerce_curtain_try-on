"""Schema request/response cho API auth."""

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import AuthProvider, UserRole

_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,32}$")


class UserRegister(BaseModel):
    """Đăng ký tài khoản local (username + mật khẩu)."""

    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=120)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        """Username chỉ gồm chữ, số và gạch dưới."""

        if not _USERNAME_PATTERN.match(value):
            raise ValueError("Username chỉ gồm chữ, số và _ (3–32 ký tự)")
        return value.lower()


class UserLogin(BaseModel):
    """Đăng nhập local bằng username."""

    username: str
    password: str

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        """Chuẩn hóa username."""

        return value.strip().lower()


class UserPublic(BaseModel):
    """Thông tin user trả về client (không có mật khẩu)."""

    id: str
    username: str | None
    email: str | None
    full_name: str
    auth_provider: AuthProvider
    email_verified: bool
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """Access token trong body; refresh nằm trong httpOnly cookie."""

    access_token: str
    token_type: str = "bearer"
    user: UserPublic | None = None
