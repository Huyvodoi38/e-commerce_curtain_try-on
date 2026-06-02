"""Giỏ hàng — một document / khách hàng, đồng bộ đa thiết bị."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field, field_validator
from pymongo import IndexModel

from app.models.common import utc_now


class CartItem(BaseModel):
    """Một dòng trong giỏ — chỉ product_id và số lượng."""

    product_id: PydanticObjectId
    quantity: int

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("quantity phải lớn hơn 0")
        return value


class Cart(Document):
    """Giỏ hàng của khách hàng (customer)."""

    user_id: PydanticObjectId
    items: list[CartItem] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "carts"
        indexes = [
            IndexModel([("user_id", 1)], name="cart_user_unique", unique=True),
        ]
