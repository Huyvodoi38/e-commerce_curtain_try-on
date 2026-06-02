"""Document danh mục sản phẩm — master data cho catalog."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.models.common import utc_now


class Category(Document):
    """Danh mục sản phẩm — Product.categories lưu slug denormalized để lọc nhanh."""

    slug: str
    name: str
    description: str | None = None
    parent_id: PydanticObjectId | None = None
    sort_order: int = 0
    is_featured: bool = False
    is_active: bool = True
    image_url: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "categories"
        indexes = [
            IndexModel([("slug", 1)], unique=True, name="slug_unique"),
            IndexModel([("is_active", 1), ("sort_order", 1)], name="active_sort_idx"),
            IndexModel([("is_featured", 1)], name="featured_idx"),
            "parent_id",
        ]
