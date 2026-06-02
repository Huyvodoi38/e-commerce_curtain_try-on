"""Schema request/response cho API khuyến mãi."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import DiscountType


def normalize_promotion_code(value: str) -> str:
    """Chuẩn hóa mã KM — uppercase, bỏ khoảng trắng."""

    return value.strip().upper()


def validate_max_discount_amount(value: int | None) -> int | None:
    """None = không giới hạn; nếu có giá trị thì phải > 0."""

    if value is not None and value <= 0:
        raise ValueError("max_discount_amount phải lớn hơn 0")
    return value


class PromotionCreate(BaseModel):
    """Tạo mã khuyến mãi — chỉ quản lý."""

    code: str = Field(..., min_length=2, max_length=32)
    description: str | None = None
    discount_type: DiscountType
    discount_value: int = Field(..., gt=0)
    min_order_value: int = Field(0, ge=0)
    max_discount_amount: int | None = Field(None, gt=0)
    start_date: datetime
    end_date: datetime
    usage_limit: int | None = Field(None, gt=0)
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = normalize_promotion_code(value)
        if not code:
            raise ValueError("Mã khuyến mãi không hợp lệ")
        return code

    @model_validator(mode="after")
    def check_dates(self) -> "PromotionCreate":
        if self.end_date <= self.start_date:
            raise ValueError("end_date phải sau start_date")
        if self.discount_type == DiscountType.PERCENTAGE and self.discount_value > 100:
            raise ValueError("Giảm % không được vượt quá 100")
        return self


class PromotionUpdate(BaseModel):
    """Cập nhật toàn bộ mã KM."""

    code: str = Field(..., min_length=2, max_length=32)
    description: str | None = None
    discount_type: DiscountType
    discount_value: int = Field(..., gt=0)
    min_order_value: int = Field(..., ge=0)
    max_discount_amount: int | None = Field(None, gt=0)
    start_date: datetime
    end_date: datetime
    usage_limit: int | None = Field(None, gt=0)
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        return normalize_promotion_code(value)

    @model_validator(mode="after")
    def check_dates(self) -> "PromotionUpdate":
        if self.end_date <= self.start_date:
            raise ValueError("end_date phải sau start_date")
        if self.discount_type == DiscountType.PERCENTAGE and self.discount_value > 100:
            raise ValueError("Giảm % không được vượt quá 100")
        return self


class PromotionPatch(BaseModel):
    """Cập nhật một phần — chỉ quản lý."""

    code: str | None = Field(None, min_length=2, max_length=32)
    description: str | None = None
    discount_type: DiscountType | None = None
    discount_value: int | None = Field(None, gt=0)
    min_order_value: int | None = Field(None, ge=0)
    max_discount_amount: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    usage_limit: int | None = Field(None, gt=0)
    is_active: bool | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_promotion_code(value)

    @field_validator("max_discount_amount")
    @classmethod
    def validate_max_discount(cls, value: int | None) -> int | None:
        return validate_max_discount_amount(value)


class PromotionSummary(BaseModel):
    """Mã KM trên danh sách — staff/manager."""

    id: str
    code: str
    description: str | None
    discount_type: DiscountType
    discount_value: int
    min_order_value: int
    start_date: datetime
    end_date: datetime
    is_active: bool
    used_count: int
    usage_limit: int | None


class PromotionDetail(PromotionSummary):
    """Chi tiết đầy đủ."""

    max_discount_amount: int | None


class PromotionListResponse(BaseModel):
    """Danh sách có phân trang."""

    items: list[PromotionSummary]
    total: int
    page: int
    page_size: int
    pages: int


class PromotionValidateRequest(BaseModel):
    """Kiểm tra mã trước khi đặt hàng (Phase 4 sẽ tính lại)."""

    code: str = Field(..., min_length=2, max_length=32)
    subtotal: int = Field(..., ge=0)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        return normalize_promotion_code(value)


class PromotionValidateResponse(BaseModel):
    """Kết quả validate — không tăng used_count."""

    valid: bool = True
    promotion_id: str
    code: str
    discount_type: DiscountType
    discount_value: int
    discount_amount: int
    subtotal: int
    total_after_discount: int
    message: str
