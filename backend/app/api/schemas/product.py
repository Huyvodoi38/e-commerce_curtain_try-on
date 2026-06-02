"""Schema request/response cho API sản phẩm."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.utils.product_images import normalize_image_urls


def _validate_sale_vs_price(price: int, sale_price: int | None) -> None:
    if sale_price is not None and sale_price > price:
        raise ValueError("sale_price không được lớn hơn price")


class _ProductImagesMixin(BaseModel):
    """image_urls là nguồn; display_image_url legacy hoặc = ảnh đầu."""

    image_urls: list[str] = Field(default_factory=list)
    display_image_url: str | None = None

    @model_validator(mode="after")
    def normalize_images(self) -> "_ProductImagesMixin":
        urls, primary = normalize_image_urls(self.image_urls, self.display_image_url)
        self.image_urls = urls
        self.display_image_url = primary
        return self


class ProductCreate(_ProductImagesMixin):
    """Tạo sản phẩm — chỉ quản lý."""

    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    price: int = Field(0, ge=0)
    sale_price: int | None = Field(None, ge=0)
    stock: int = Field(0, ge=0)
    categories: list[str] = Field(default_factory=list)
    ai_texture_url: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

    @model_validator(mode="after")
    def check_sale_price(self) -> "ProductCreate":
        _validate_sale_vs_price(self.price, self.sale_price)
        return self


class ProductUpdate(_ProductImagesMixin):
    """Cập nhật toàn bộ sản phẩm."""

    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    price: int = Field(..., ge=0)
    sale_price: int | None = Field(None, ge=0)
    stock: int = Field(..., ge=0)
    categories: list[str] = Field(default_factory=list)
    ai_texture_url: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

    @model_validator(mode="after")
    def check_sale_price(self) -> "ProductUpdate":
        _validate_sale_vs_price(self.price, self.sale_price)
        return self


class ProductPatch(BaseModel):
    """Cập nhật một phần — chỉ quản lý."""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    price: int | None = Field(None, ge=0)
    sale_price: int | None = None
    stock: int | None = Field(None, ge=0)
    categories: list[str] | None = None
    image_urls: list[str] | None = None
    display_image_url: str | None = None
    ai_texture_url: str | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None


class ProductStockPatch(BaseModel):
    """Cập nhật tồn kho — nhân viên hoặc quản lý."""

    stock: int = Field(..., ge=0)


class ProductPublic(BaseModel):
    """Sản phẩm cho khách / guest."""

    id: str
    name: str
    description: str | None
    price: int
    sale_price: int | None
    effective_price: int
    is_on_sale: bool
    stock: int
    categories: list[str]
    image_urls: list[str]
    display_image_url: str | None
    ai_texture_url: str | None


class ProductDetail(ProductPublic):
    """Chi tiết — thêm field nội bộ khi staff/manager xem."""

    is_active: bool
    attributes: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    """Danh sách có phân trang."""

    items: list[ProductPublic]
    total: int
    page: int
    page_size: int
    pages: int
