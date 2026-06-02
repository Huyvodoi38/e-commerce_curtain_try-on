"""Schema API đơn hàng."""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator, field_validator

from app.models.enums import OfflineSubtype, OrderStatus, PaymentMethod, PaymentStatus
from app.models.schemas import ShippingAddress


class OrderCreateBase(BaseModel):
    """Phần chung khi tạo đơn."""

    shipping_address: ShippingAddress
    payment_method: PaymentMethod = PaymentMethod.OFFLINE
    offline_subtype: OfflineSubtype | None = OfflineSubtype.COD
    promotion_code: str | None = None

    @field_validator("promotion_code")
    @classmethod
    def strip_promotion_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def normalize_payment_fields(self) -> "OrderCreateBase":
        if self.payment_method == PaymentMethod.OFFLINE:
            if self.offline_subtype is None:
                self.offline_subtype = OfflineSubtype.COD
        return self


class OrderCreateFromCart(OrderCreateBase):
    """POST /orders — từ giỏ hàng."""


class OrderCreateBuyNow(OrderCreateBase):
    """POST /orders/buy-now."""

    product_id: str
    quantity: int = Field(..., ge=1)


class BankInstructions(BaseModel):
    """Thông tin chuyển khoản — khi offline_subtype=bank."""

    bank_name: str
    account_number: str
    account_holder: str
    transfer_note: str
    order_id: str


class OrderItemPublic(BaseModel):
    """Dòng đơn hàng trả về API."""

    product_id: str
    product_name: str
    quantity: int
    unit_price: int
    line_total: int


class OrderSummary(BaseModel):
    """Tóm tắt đơn — danh sách."""

    id: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    offline_subtype: OfflineSubtype
    subtotal: int
    discount_amount: int
    total_amount: int
    item_count: int
    created_at: datetime
    paid_at: datetime | None = None


class OrderDetail(OrderSummary):
    """Chi tiết đơn."""

    user_id: str
    items: list[OrderItemPublic]
    promotion_id: str | None = None
    promotion_code: str | None = None
    shipping_address: ShippingAddress


class VnpayPaymentInfo(BaseModel):
    """Phiên thanh toán VNPay (redirect + QR trên cổng VNPay)."""

    payment_url: str
    expires_at: datetime
    txn_ref: str


class OrderCreateResponse(BaseModel):
    """Response sau tạo đơn."""

    order: OrderDetail
    bank_instructions: BankInstructions | None = None
    vnpay: VnpayPaymentInfo | None = None


class OrderListResponse(BaseModel):
    """Danh sách đơn có phân trang."""

    items: list[OrderSummary]
    total: int
    page: int
    page_size: int


class OrderStatusUpdate(BaseModel):
    """Staff đổi trạng thái vận hành."""

    status: OrderStatus
    reason: str | None = Field(None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def require_reason_on_staff_cancel(self) -> "OrderStatusUpdate":
        if self.status == OrderStatus.CANCELLED:
            if not self.reason or not self.reason.strip():
                raise ValueError("reason bắt buộc khi hủy đơn")
        return self
