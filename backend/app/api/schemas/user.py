"""Schema API quản trị user."""

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.api.schemas.auth import UserPublic, _USERNAME_PATTERN
from app.models.enums import UserRole

StaffCreateRole = Literal["customer"]
ManagerCreateRole = Literal["customer", "staff"]


class UserCreate(BaseModel):
    """Tạo user — staff chỉ customer; manager thêm staff."""

    role: UserRole
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=120)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not _USERNAME_PATTERN.match(value):
            raise ValueError("Username chỉ gồm chữ, số và _ (3–32 ký tự)")
        return value.lower()

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: UserRole) -> UserRole:
        if value not in (UserRole.CUSTOMER, UserRole.STAFF):
            raise ValueError("Chỉ tạo được customer hoặc staff")
        return value


class UserAdminPatch(BaseModel):
    """Cập nhật user — field tùy quyền và loại tài khoản."""

    full_name: str | None = Field(None, min_length=1, max_length=120)
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8, max_length=128)
    reason: str | None = Field(None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def require_reason_on_deactivate(self) -> "UserAdminPatch":
        if self.is_active is False:
            if not self.reason or not self.reason.strip():
                raise ValueError("reason bắt buộc khi vô hiệu hóa tài khoản")
        return self


class UserListResponse(BaseModel):
    """Danh sách user."""

    items: list[UserPublic]
    total: int
    page: int
    page_size: int
