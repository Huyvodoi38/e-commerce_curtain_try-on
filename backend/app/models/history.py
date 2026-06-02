"""Định nghĩa document TryOnHistory (lịch sử thử rèm AI) cho MongoDB bằng Beanie."""

from datetime import datetime
from typing import Any

from beanie import Document, PydanticObjectId
from pydantic import Field

from app.models.common import utc_now
from app.models.enums import AIStatus


class TryOnHistory(Document):
    """Document lưu lịch sử thử rèm AI của người dùng."""

    user_id: PydanticObjectId
    product_id: PydanticObjectId
    original_room_url: str
    result_url: str | None = None
    ai_status: AIStatus = AIStatus.PROCESSING
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        """Cấu hình collection và index cho TryOnHistory document."""

        name = "try_on_histories"
        indexes = [
            "user_id",
            "ai_status",
            [("user_id", 1), ("created_at", -1)],
        ]
