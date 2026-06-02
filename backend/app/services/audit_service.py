"""Ghi và truy vấn activity log."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.api.schemas.activity_log import ActivityLogPublic, ActivityLogListResponse
from app.core.roles import is_manager, is_staff_or_above
from app.models.activity_log import ActivityLog
from app.models.enums import ActivityAction, UserRole
from app.models.user import User


def user_label(user: User) -> str:
    """Nhãn hiển thị trên log."""

    if user.username:
        return user.username
    if user.email:
        return user.email
    return str(user.id)


async def log_activity(
    *,
    actor: User,
    action: ActivityAction,
    customer_id: PydanticObjectId | None = None,
    target_user_id: PydanticObjectId | None = None,
    order_id: PydanticObjectId | None = None,
    metadata: dict[str, Any] | None = None,
) -> ActivityLog:
    """Ghi một dòng activity log."""

    entry = ActivityLog(
        actor_id=actor.id,
        actor_role=actor.role,
        actor_name=actor.full_name,
        action=action,
        customer_id=customer_id,
        target_user_id=target_user_id,
        order_id=order_id,
        metadata=metadata or {},
    )
    await entry.insert()
    return entry


def _log_to_public(entry: ActivityLog) -> ActivityLogPublic:
    return ActivityLogPublic(
        id=str(entry.id),
        actor_id=str(entry.actor_id),
        actor_role=entry.actor_role,
        actor_name=entry.actor_name,
        action=entry.action,
        customer_id=str(entry.customer_id) if entry.customer_id else None,
        target_user_id=str(entry.target_user_id) if entry.target_user_id else None,
        order_id=str(entry.order_id) if entry.order_id else None,
        metadata=entry.metadata,
        created_at=entry.created_at,
    )


async def list_activity_logs(
    *,
    current_user: User,
    page: int,
    page_size: int,
    customer_id: str | None = None,
    order_id: str | None = None,
    actor_id: str | None = None,
    action: ActivityAction | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> ActivityLogListResponse:
    """Staff: log có customer_id. Manager: toàn bộ."""

    if not is_staff_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")

    query: dict[str, Any] = {}
    if not is_manager(current_user):
        query["customer_id"] = {"$ne": None}

    if customer_id is not None:
        query["customer_id"] = _parse_oid(customer_id, detail="customer_id không hợp lệ")
    if order_id is not None:
        query["order_id"] = _parse_oid(order_id, detail="order_id không hợp lệ")
    if actor_id is not None:
        query["actor_id"] = _parse_oid(actor_id, detail="actor_id không hợp lệ")
    if action is not None:
        query["action"] = action
    if from_date is not None or to_date is not None:
        created: dict[str, Any] = {}
        if from_date is not None:
            created["$gte"] = from_date
        if to_date is not None:
            created["$lte"] = to_date
        query["created_at"] = created

    skip = (page - 1) * page_size
    total = await ActivityLog.find(query).count()
    items = (
        await ActivityLog.find(query)
        .sort([("created_at", -1)])
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    return ActivityLogListResponse(
        items=[_log_to_public(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


async def list_logs_for_user(
    user_id: str,
    *,
    current_user: User,
    page: int,
    page_size: int,
) -> ActivityLogListResponse:
    """Timeline theo user — customer_id hoặc target_user_id."""

    target = await _get_user_or_404(user_id)
    _ensure_can_view_user_logs(current_user, target)

    oid = target.id
    if is_manager(current_user):
        query: dict[str, Any] = {
            "$or": [
                {"customer_id": oid},
                {"target_user_id": oid},
            ]
        }
    else:
        if target.role != UserRole.CUSTOMER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ xem log của khách hàng",
            )
        query = {"customer_id": oid}

    skip = (page - 1) * page_size
    total = await ActivityLog.find(query).count()
    items = (
        await ActivityLog.find(query)
        .sort([("created_at", -1)])
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    return ActivityLogListResponse(
        items=[_log_to_public(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def _ensure_can_view_user_logs(actor: User, target: User) -> None:
    if is_manager(actor):
        return
    if not is_staff_or_above(actor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")
    if target.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ xem log của khách hàng",
        )


async def _get_user_or_404(user_id: str) -> User:
    oid = _parse_oid(user_id, detail="Không tìm thấy người dùng")
    user = await User.get(oid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user


def _parse_oid(value: str, *, detail: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
