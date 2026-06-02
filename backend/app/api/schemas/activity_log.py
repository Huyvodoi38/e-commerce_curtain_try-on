"""Schema API activity log."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import ActivityAction, UserRole


class ActivityLogPublic(BaseModel):
    """Một dòng log."""

    id: str
    actor_id: str
    actor_role: UserRole
    actor_name: str
    action: ActivityAction
    customer_id: str | None = None
    target_user_id: str | None = None
    order_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class ActivityLogListResponse(BaseModel):
    """Danh sách log có phân trang."""

    items: list[ActivityLogPublic]
    total: int
    page: int
    page_size: int
