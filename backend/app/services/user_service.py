"""Quản trị user — staff/manager customer; manager staff."""

from __future__ import annotations

from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.api.schemas.auth import UserPublic
from app.api.schemas.user import UserAdminPatch, UserCreate, UserListResponse
from app.core.roles import is_manager, is_staff_or_above
from app.core.security import hash_password
from app.models.enums import ActivityAction, AuthProvider, UserRole
from app.models.user import User
from app.services import audit_service
from app.services.auth_service import revoke_all_refresh_tokens, user_to_public


async def list_users(
    *,
    current_user: User,
    page: int,
    page_size: int,
    role_filter: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> UserListResponse:
    """Staff chỉ xem customer; manager xem mọi role (trừ filter manager)."""

    if not is_staff_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")

    query: dict[str, Any] = {}

    if is_manager(current_user):
        if role_filter is not None:
            if role_filter == UserRole.MANAGER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không lọc theo manager",
                )
            query["role"] = role_filter
    else:
        if role_filter not in (None, UserRole.CUSTOMER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ xem danh sách khách hàng",
            )
        query["role"] = UserRole.CUSTOMER

    if is_active is not None:
        query["is_active"] = is_active

    if search:
        pattern = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [
            {"username": pattern},
            {"full_name": pattern},
            {"email": pattern},
        ]

    skip = (page - 1) * page_size
    total = await User.find(query).count()
    users = (
        await User.find(query)
        .sort([("created_at", -1)])
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    return UserListResponse(
        items=[user_to_public(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


async def create_user(actor: User, data: UserCreate) -> UserPublic:
    """Tạo customer (staff+) hoặc staff (manager)."""

    if not is_staff_or_above(actor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")

    if data.role == UserRole.STAFF and not is_manager(actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ quản lý mới tạo nhân viên",
        )

    existing = await User.find({"username": data.username}).first_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username đã được sử dụng",
        )

    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        auth_provider=AuthProvider.LOCAL,
        email_verified=False,
        role=data.role,
        is_active=True,
    )
    await user.insert()

    customer_id = user.id if data.role == UserRole.CUSTOMER else None
    await audit_service.log_activity(
        actor=actor,
        action=ActivityAction.USER_CREATED,
        customer_id=customer_id,
        target_user_id=user.id,
        metadata={
            "role": data.role.value,
            "username": data.username,
            "target_label": audit_service.user_label(user),
        },
    )

    return user_to_public(user)


async def get_user_admin(user_id: str, actor: User) -> UserPublic:
    """Chi tiết user — staff chỉ customer."""

    target = await _get_user_or_404(user_id)
    _ensure_can_view_user(actor, target)
    return user_to_public(target)


async def patch_user_admin(user_id: str, actor: User, data: UserAdminPatch) -> UserPublic:
    """Cập nhật user theo quyền."""

    target = await _get_user_or_404(user_id)
    _ensure_can_patch_user(actor, target)

    updates = data.model_dump(exclude_unset=True)
    reason = updates.pop("reason", None)
    password = updates.pop("password", None)
    changes: dict[str, Any] = {}
    status_logged = False

    if password is not None:
        if target.auth_provider != AuthProvider.LOCAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ đổi mật khẩu tài khoản đăng nhập bằng username",
            )
        if not _can_set_password(actor, target):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền đổi mật khẩu")
        target.hashed_password = hash_password(password)
        changes["password"] = {"reset": True}

    if "full_name" in updates:
        if not _can_edit_profile(actor, target):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")
        changes["full_name"] = {"from": target.full_name, "to": updates["full_name"]}
        target.full_name = updates["full_name"]

    if "is_active" in updates:
        if not _can_change_active(actor, target):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")
        new_active = updates["is_active"]
        if actor.id == target.id and not new_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không thể tự vô hiệu hóa tài khoản của mình",
            )
        changes["is_active"] = {"from": target.is_active, "to": new_active}
        target.is_active = new_active
        status_logged = True
        if not new_active:
            await revoke_all_refresh_tokens(target.id)
            await audit_service.log_activity(
                actor=actor,
                action=ActivityAction.USER_DEACTIVATED,
                customer_id=target.id if target.role == UserRole.CUSTOMER else None,
                target_user_id=target.id,
                metadata={
                    "reason": reason,
                    "changes": changes,
                    "target_label": audit_service.user_label(target),
                },
            )
        else:
            await audit_service.log_activity(
                actor=actor,
                action=ActivityAction.USER_ACTIVATED,
                customer_id=target.id if target.role == UserRole.CUSTOMER else None,
                target_user_id=target.id,
                metadata={
                    "reason": reason,
                    "changes": changes,
                    "target_label": audit_service.user_label(target),
                },
            )

    if changes and not status_logged:
        await _log_user_updated(actor, target, changes=changes, reason=reason)

    await target.save()
    return user_to_public(target)


async def _log_user_updated(
    actor: User,
    target: User,
    *,
    changes: dict[str, Any],
    reason: str | None,
) -> None:
    meta: dict[str, Any] = {"changes": changes, "target_label": audit_service.user_label(target)}
    if reason:
        meta["reason"] = reason
    await audit_service.log_activity(
        actor=actor,
        action=ActivityAction.USER_UPDATED,
        customer_id=target.id if target.role == UserRole.CUSTOMER else None,
        target_user_id=target.id,
        metadata=meta,
    )


def _ensure_can_view_user(actor: User, target: User) -> None:
    if is_manager(actor):
        return
    if target.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ xem khách hàng",
        )


def _ensure_can_patch_user(actor: User, target: User) -> None:
    if target.role == UserRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không sửa tài khoản quản lý",
        )
    if is_manager(actor):
        return
    if target.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ sửa khách hàng",
        )


def _can_edit_profile(actor: User, target: User) -> bool:
    if is_manager(actor):
        return True
    return target.role == UserRole.CUSTOMER


def _can_change_active(actor: User, target: User) -> bool:
    return _can_edit_profile(actor, target) or (is_manager(actor) and target.role == UserRole.STAFF)


def _can_set_password(actor: User, target: User) -> bool:
    if target.role == UserRole.MANAGER:
        return False
    if is_manager(actor):
        return target.role in (UserRole.CUSTOMER, UserRole.STAFF)
    return target.role == UserRole.CUSTOMER


async def _get_user_or_404(user_id: str) -> User:
    try:
        oid = PydanticObjectId(user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        ) from exc
    user = await User.get(oid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user
