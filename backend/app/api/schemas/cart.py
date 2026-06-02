"""Schema API giỏ hàng."""

from datetime import datetime

from pydantic import BaseModel, Field


class CartItemInput(BaseModel):
    """Thêm / cập nhật một dòng."""

    product_id: str
    quantity: int = Field(..., ge=1)


class CartItemReplace(BaseModel):
    """Thay toàn bộ giỏ (đồng bộ từ thiết bị khác)."""

    product_id: str
    quantity: int = Field(..., ge=1)


class CartItemsReplaceRequest(BaseModel):
    """PUT /cart/items — danh sách thay thế."""

    items: list[CartItemReplace] = Field(default_factory=list)


class CartItemQuantityPatch(BaseModel):
    """PATCH quantity — 0 sẽ xóa dòng (xử lý ở service)."""

    quantity: int = Field(..., ge=0)


class CartLineItem(BaseModel):
    """Dòng giỏ đã enrich từ Product."""

    product_id: str
    name: str
    quantity: int
    unit_price: int
    line_total: int
    stock: int
    display_image_url: str | None = None


class CartResponse(BaseModel):
    """Giỏ hàng hiện tại — không lưu mã KM."""

    items: list[CartLineItem]
    subtotal: int
    item_count: int
    updated_at: datetime
    removed_product_ids: list[str] = Field(
        default_factory=list,
        description="SP đã bị xóa khỏi giỏ vì không còn bán",
    )
