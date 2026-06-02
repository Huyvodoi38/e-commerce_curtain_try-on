"""Định nghĩa document Order và schema OrderItem cho MongoDB bằng Beanie."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.common import utc_now
from app.models.enums import OfflineSubtype, OrderStatus, PaymentMethod, PaymentStatus
from app.models.schemas import ShippingAddress


class OrderItem(BaseModel):
    """Một dòng sản phẩm trong đơn hàng (snapshot tại thời điểm đặt)."""

    product_id: PydanticObjectId
    product_name: str  # Tên sản phẩm tại thời điểm đặt
    quantity: int
    unit_price: int  # Đơn giá thực tế (VND) sau sale_price nếu có

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, value: int) -> int:
        """Số lượng phải lớn hơn 0."""

        if value <= 0:
            raise ValueError("quantity phải lớn hơn 0")
        return value

    @field_validator("unit_price")
    @classmethod
    def unit_price_non_negative(cls, value: int) -> int:
        """Đơn giá không được âm."""

        if value < 0:
            raise ValueError("unit_price không được âm")
        return value


class Order(Document):
    """Document đại diện cho đơn hàng của người dùng."""

    user_id: PydanticObjectId
    items: list[OrderItem]
    subtotal: int  # Tổng tiền hàng trước khi giảm mã
    promotion_id: PydanticObjectId | None = None  # Mã giảm giá đã áp dụng (nếu có)
    discount_amount: int = 0  # Số tiền giảm giá thực tế (VND)
    total_amount: int  # Số tiền cuối cùng khách trả = subtotal - discount_amount
    shipping_address: ShippingAddress
    status: OrderStatus = OrderStatus.PENDING
    payment_method: PaymentMethod = PaymentMethod.OFFLINE
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    offline_subtype: OfflineSubtype = OfflineSubtype.COD
    paid_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)

    class Settings:
        """Cấu hình collection và index cho Order document."""

        name = "orders"
        indexes = [
            "user_id",
            "status",
            "payment_status",
            [("user_id", 1), ("created_at", -1)],
        ]

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, value: list[OrderItem]) -> list[OrderItem]:
        """Đơn hàng phải có ít nhất một sản phẩm."""

        if not value:
            raise ValueError("Đơn hàng phải có ít nhất một sản phẩm")
        return value

    @model_validator(mode="after")
    def validate_amounts(self) -> "Order":
        """Đảm bảo công thức tiền và giá trị không âm."""

        if self.subtotal < 0:
            raise ValueError("subtotal không được âm")
        if self.discount_amount < 0:
            raise ValueError("discount_amount không được âm")
        if self.discount_amount > self.subtotal:
            raise ValueError("discount_amount không được lớn hơn subtotal")
        if self.total_amount != self.subtotal - self.discount_amount:
            raise ValueError("total_amount phải bằng subtotal - discount_amount")
        return self
