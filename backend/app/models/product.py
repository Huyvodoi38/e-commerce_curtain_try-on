"""Định nghĩa document Product cho MongoDB bằng Beanie."""

from datetime import datetime
from typing import Any

from beanie import Document
from pydantic import Field, field_validator, model_validator
from pymongo import IndexModel

from app.models.common import utc_now


class Product(Document):
    """Document đại diện cho sản phẩm rèm trong hệ thống."""

    name: str
    description: str | None = None
    price: int = 0  # Giá gốc (VND)
    sale_price: int | None = None  # Giá khuyến mãi; None hoặc >= price thì không giảm
    stock: int = 0
    categories: list[str] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)  # [0] = ảnh chính
    display_image_url: str | None = None  # Denormalized: trùng image_urls[0]
    ai_texture_url: str | None = None  # Phase AI — tùy chọn tạm thời
    attributes: dict[str, Any] = Field(default_factory=dict)
    rating_avg: float | None = None
    rating_count: int = 0
    is_active: bool = True  # False = ẩn khỏi catalog public
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        """Cấu hình collection và index cho Product."""

        name = "products"
        indexes = [
            "name",
            "categories",
            IndexModel([("is_active", 1), ("created_at", -1)], name="active_created_idx"),
        ]

    @field_validator("price", "stock")
    @classmethod
    def non_negative(cls, value: int) -> int:
        """Giá và tồn kho không được âm."""

        if value < 0:
            raise ValueError("Giá trị không được nhỏ hơn 0")
        return value

    @model_validator(mode="after")
    def validate_sale_price(self) -> "Product":
        """sale_price phải hợp lệ so với price."""

        if self.sale_price is not None:
            if self.sale_price < 0:
                raise ValueError("sale_price không được âm")
            if self.sale_price > self.price:
                raise ValueError("sale_price không được lớn hơn price")
        return self
