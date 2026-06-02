"""Nhật ký hoạt động — customer timeline, quản trị user, đơn hàng."""

from datetime import datetime
from typing import Any

from beanie import Document, PydanticObjectId
from pydantic import Field

from app.models.common import utc_now
from app.models.enums import ActivityAction, UserRole


class ActivityLog(Document):
    """Log hành động gắn với khách hàng và/hoặc đơn hàng."""

    actor_id: PydanticObjectId
    actor_role: UserRole
    actor_name: str
    action: ActivityAction
    customer_id: PydanticObjectId | None = None
    target_user_id: PydanticObjectId | None = None
    order_id: PydanticObjectId | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "activity_logs"
        indexes = [
            [("customer_id", 1), ("created_at", -1)],
            [("order_id", 1), ("created_at", -1)],
            [("actor_id", 1), ("created_at", -1)],
            [("target_user_id", 1), ("created_at", -1)],
            "action",
        ]
