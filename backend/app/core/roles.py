"""Kiểm tra phân quyền theo vai trò — customer / staff / manager."""

from app.models.enums import UserRole
from app.models.user import User

# Nhân viên + quản lý (nghiệp vụ vận hành)
STAFF_AND_ABOVE: frozenset[UserRole] = frozenset({UserRole.STAFF, UserRole.MANAGER})


def is_customer(user: User) -> bool:
    """Khách hàng."""

    return user.role == UserRole.CUSTOMER


def is_staff(user: User) -> bool:
    """Nhân viên (không bao gồm quản lý)."""

    return user.role == UserRole.STAFF


def is_manager(user: User) -> bool:
    """Quản lý — toàn quyền cấu hình."""

    return user.role == UserRole.MANAGER


def is_staff_or_above(user: User) -> bool:
    """Nhân viên hoặc quản lý."""

    return user.role in STAFF_AND_ABOVE


def can_manage_users(user: User) -> bool:
    """Chỉ quản lý được tạo/sửa tài khoản staff."""

    return is_manager(user)
