"""Schema Pydantic nhúng (không phải Document) dùng chung."""

from pydantic import BaseModel, Field


class ShippingAddress(BaseModel):
    """Địa chỉ giao hàng có cấu trúc."""

    full_name: str
    phone: str
    line1: str = Field(..., description="Số nhà, đường")
    ward: str = Field(..., description="Phường / xã")
    district: str = Field(..., description="Quận / huyện")
    city: str = Field(..., description="Tỉnh / thành phố")
    note: str | None = Field(default=None, description="Ghi chú giao hàng")
