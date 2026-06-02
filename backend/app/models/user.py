"""Định nghĩa document User cho MongoDB bằng Beanie."""

from datetime import datetime

from beanie import Document
from pydantic import Field, model_validator
from pymongo import IndexModel

from app.models.common import utc_now
from app.models.enums import AuthProvider, UserRole


class User(Document):
    """
    Document người dùng.

    Auth: local (username) hoặc Google (email).
    Role: customer | staff | manager.
    """

    username: str | None = None  # Bắt buộc nếu auth_provider=local
    email: str | None = None  # Bắt buộc nếu auth_provider=google
    hashed_password: str | None = None
    full_name: str
    auth_provider: AuthProvider
    email_verified: bool = False
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        """Cấu hình collection và index cho User."""

        name = "users"
        indexes = [
            "role",
            IndexModel(
                [("username", 1)],
                unique=True,
                name="username_unique",
                partialFilterExpression={"username": {"$type": "string"}},
            ),
            IndexModel(
                [("email", 1)],
                unique=True,
                name="email_unique",
                partialFilterExpression={"email": {"$type": "string"}},
            ),
            IndexModel([("auth_provider", 1)], name="auth_provider_idx"),
        ]

    @model_validator(mode="after")
    def validate_auth_fields(self) -> "User":
        """Ràng buộc theo loại tài khoản."""

        if self.auth_provider == AuthProvider.LOCAL:
            if not self.username or not self.hashed_password:
                raise ValueError("Tài khoản local cần username và mật khẩu")
            if self.email is not None:
                raise ValueError("Tài khoản local không được có email")
        elif self.auth_provider == AuthProvider.GOOGLE:
            if not self.email:
                raise ValueError("Tài khoản Google cần email")
            if self.hashed_password is not None:
                raise ValueError("Tài khoản Google không được có mật khẩu")
            if self.username is not None:
                raise ValueError("Tài khoản Google không được có username")
        return self
