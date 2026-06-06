"""Schema request/response cho API đánh giá sản phẩm."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ReviewSource


class ReviewCreate(BaseModel):
    """Khách hàng gửi đánh giá."""

    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class ReviewUpdate(BaseModel):
    """Khách hàng cập nhật đánh giá của mình."""

    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class AdminReviewCreate(BaseModel):
    """Quản lý thêm đánh giá thủ công."""

    product_id: str
    author_name: str = Field(..., min_length=1, max_length=100)
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)

    @field_validator("author_name")
    @classmethod
    def strip_author_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("author_name không được rỗng")
        return trimmed

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class ReviewPublic(BaseModel):
    """Đánh giá hiển thị trên storefront."""

    id: str
    product_id: str
    author_name: str
    rating: int
    comment: str | None
    source: ReviewSource
    created_at: datetime
    updated_at: datetime
    is_mine: bool = False


class ReviewListResponse(BaseModel):
    items: list[ReviewPublic]
    total: int
    page: int
    page_size: int
    pages: int
    my_review: ReviewPublic | None = None


class AdminReviewPublic(BaseModel):
    """Đánh giá trong admin — kèm tên sản phẩm."""

    id: str
    product_id: str
    product_name: str
    user_id: str | None
    author_name: str
    rating: int
    comment: str | None
    source: ReviewSource
    created_at: datetime
    updated_at: datetime


class AdminReviewListResponse(BaseModel):
    items: list[AdminReviewPublic]
    total: int
    page: int
    page_size: int
    pages: int
