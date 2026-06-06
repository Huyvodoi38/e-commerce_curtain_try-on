"""Document đánh giá sản phẩm."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field, field_validator
from pymongo import IndexModel

from app.models.common import utc_now
from app.models.enums import ReviewSource


class ProductReview(Document):
    """Một đánh giá (sao + nội dung) cho sản phẩm."""

    product_id: PydanticObjectId
    user_id: PydanticObjectId | None = None
    author_name: str
    rating: int
    comment: str | None = None
    source: ReviewSource = ReviewSource.CUSTOMER
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "product_reviews"
        indexes = [
            IndexModel([("product_id", 1), ("created_at", -1)], name="product_created_idx"),
            IndexModel(
                [("product_id", 1), ("user_id", 1)],
                name="product_user_unique_idx",
                unique=True,
                partialFilterExpression={"user_id": {"$type": "objectId"}},
            ),
        ]

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, value: int) -> int:
        if value < 1 or value > 5:
            raise ValueError("rating phải từ 1 đến 5")
        return value

    @field_validator("author_name")
    @classmethod
    def author_name_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("author_name không được rỗng")
        return trimmed

    @field_validator("comment")
    @classmethod
    def comment_max_length(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if len(trimmed) > 1000:
            raise ValueError("comment tối đa 1000 ký tự")
        return trimmed
