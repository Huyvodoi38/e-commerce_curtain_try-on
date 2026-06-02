"""Refresh token đã phát hành (lưu hash, hỗ trợ revoke & rotate)."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.models.common import utc_now


class RefreshToken(Document):
    """Refresh token — chỉ lưu hash, không lưu plain text."""

    user_id: PydanticObjectId
    jti: str  # JWT ID — khóa tra cứu
    token_hash: str
    expires_at: datetime
    revoked: bool = False
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        """Cấu hình collection refresh_tokens."""

        name = "refresh_tokens"
        indexes = [
            IndexModel([("jti", 1)], unique=True, name="jti_unique"),
            "user_id",
            IndexModel([("expires_at", 1)], expireAfterSeconds=0, name="ttl_expires"),
        ]
