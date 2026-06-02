"""Schema API danh mục sản phẩm."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def _normalize_slug(value: str) -> str:
    return value.strip().lower()


class CategoryCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    parent_id: str | None = None
    sort_order: int = 0
    is_featured: bool = False
    is_active: bool = True
    image_url: str | None = None

    @field_validator("slug")
    @classmethod
    def slug_lower(cls, value: str) -> str:
        return _normalize_slug(value)


class CategoryUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    parent_id: str | None = None
    sort_order: int = 0
    is_featured: bool = False
    is_active: bool = True
    image_url: str | None = None


class CategoryPatch(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = None
    parent_id: str | None = None
    sort_order: int | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    image_url: str | None = None


class CategorySlugPatch(BaseModel):
    """Đổi slug — đồng bộ sang Product.categories."""

    slug: str = Field(..., min_length=1, max_length=64)

    @field_validator("slug")
    @classmethod
    def slug_lower(cls, value: str) -> str:
        return _normalize_slug(value)


class CategoryPublic(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None
    parent_id: str | None
    sort_order: int
    is_featured: bool
    image_url: str | None


class CategoryDetail(CategoryPublic):
    is_active: bool
    product_count: int = 0
    created_at: datetime
    updated_at: datetime


class CategoryListResponse(BaseModel):
    items: list[CategoryPublic]
    total: int


class CategoryTreeNode(CategoryPublic):
    children: list["CategoryTreeNode"] = Field(default_factory=list)


CategoryTreeNode.model_rebuild()
