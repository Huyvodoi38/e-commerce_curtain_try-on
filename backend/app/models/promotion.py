"""Định nghĩa document Promotion (mã khuyến mãi) cho MongoDB bằng Beanie."""

from datetime import datetime

from beanie import Document
from pydantic import model_validator
from pymongo import IndexModel

from app.models.enums import DiscountType


class Promotion(Document):
    """Document đại diện cho chương trình khuyến mãi e-commerce."""

    code: str  # Ví dụ: 'REMVUI10' — unique qua IndexModel bên Settings
    description: str | None = None  # Mô tả chương trình khuyến mãi
    discount_type: DiscountType
    discount_value: int  # % (1–100) hoặc số tiền VND cố định
    min_order_value: int = 0  # Giá trị đơn hàng tối thiểu (VND)
    max_discount_amount: int | None = None  # Trần giảm khi dùng %
    start_date: datetime
    end_date: datetime  # Ngày hết hạn mã
    usage_limit: int | None = None  # Số lần sử dụng tối đa
    used_count: int = 0  # Số lần đã sử dụng thực tế
    is_active: bool = True  # Trạng thái kích hoạt mã

    class Settings:
        """Cấu hình collection cho Promotion document."""

        name = "promotions"
        indexes = [
            IndexModel([("code", 1)], name="promotion_code_unique", unique=True),
        ]

    @model_validator(mode="after")
    def validate_promotion(self) -> "Promotion":
        """Kiểm tra logic ngày và giá trị giảm."""

        if self.end_date <= self.start_date:
            raise ValueError("end_date phải sau start_date")
        if self.discount_value <= 0:
            raise ValueError("discount_value phải lớn hơn 0")
        if self.discount_type == DiscountType.PERCENTAGE and self.discount_value > 100:
            raise ValueError("Giảm % không được vượt quá 100")
        if self.max_discount_amount is not None and self.max_discount_amount <= 0:
            raise ValueError("max_discount_amount phải lớn hơn 0")
        if self.used_count < 0:
            raise ValueError("used_count không được âm")
        return self
