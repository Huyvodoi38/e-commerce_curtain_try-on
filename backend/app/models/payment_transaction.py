"""Phiên thanh toán VNPay — một đơn có thể có nhiều phiên (thanh toán lại)."""

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field

from app.models.common import utc_now
from app.models.enums import PaymentProvider, PaymentTransactionStatus


class PaymentTransaction(Document):
    """Giao dịch VNPay gắn với đơn hàng."""

    order_id: PydanticObjectId
    provider: PaymentProvider = PaymentProvider.VNPAY
    txn_ref: str = Field(..., description="vnp_TxnRef — unique")
    amount: int = Field(..., description="Số tiền VND khớp order.total_amount")
    status: PaymentTransactionStatus = PaymentTransactionStatus.INITIATED
    vnp_transaction_no: str | None = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=utc_now)
    paid_at: datetime | None = None

    class Settings:
        name = "payment_transactions"
        indexes = [
            "order_id",
            "status",
            "expires_at",
            [("txn_ref", 1)],
        ]
