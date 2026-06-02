"""Liên kết tài khoản User với nhà cung cấp OAuth."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.models.common import utc_now
from app.models.enums import OAuthProvider


class UserOAuthAccount(Document):
    """Bản ghi OAuth — một user có thể có tài khoản Google."""

    user_id: PydanticObjectId
    provider: OAuthProvider
    provider_user_id: str  # Google `sub`
    email: str
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        """Cấu hình collection user_oauth_accounts."""

        name = "user_oauth_accounts"
        indexes = [
            IndexModel(
                [("provider", 1), ("provider_user_id", 1)],
                unique=True,
                name="provider_user_unique",
            ),
            "user_id",
        ]
