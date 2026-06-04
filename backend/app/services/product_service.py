"""Nghiệp vụ sản phẩm rèm."""

import math
import re
from datetime import datetime
from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.api.schemas.product import (
    ProductCreate,
    ProductDetail,
    ProductListItem,
    ProductListResponse,
    ProductPatch,
    ProductPublic,
    ProductStockPatch,
    ProductUpdate,
)
from app.models.cart import Cart
from app.models.common import utc_now
from app.models.order import Order
from app.models.product import Product
from app.services import category_service
from app.utils.product_images import normalize_image_urls, resolved_image_urls


def compute_effective_price(price: int, sale_price: int | None) -> tuple[int, bool]:
    """Tính giá bán thực tế và có đang giảm giá không."""

    if sale_price is not None and sale_price < price:
        return sale_price, True
    return price, False


def _apply_images_to_product(
    product: Product,
    *,
    image_urls: list[str] | None = None,
    display_image_url: str | None = None,
) -> None:
    urls, primary = normalize_image_urls(image_urls, display_image_url)
    product.image_urls = urls
    product.display_image_url = primary


def product_to_public(product: Product) -> ProductPublic:
    """Map sang schema public."""

    effective, on_sale = compute_effective_price(product.price, product.sale_price)
    urls = resolved_image_urls(product.image_urls, product.display_image_url)
    return ProductPublic(
        id=str(product.id),
        name=product.name,
        description=product.description,
        price=product.price,
        sale_price=product.sale_price,
        effective_price=effective,
        is_on_sale=on_sale,
        stock=product.stock,
        categories=product.categories or [],
        image_urls=urls,
        display_image_url=urls[0] if urls else None,
        ai_texture_url=product.ai_texture_url,
    )


def product_to_list_item(product: Product, *, staff_view: bool = False) -> ProductListItem:
    """Map sang schema danh sách — chỉ staff/manager mới có is_active."""

    base = product_to_public(product)
    if staff_view:
        return ProductListItem(**base.model_dump(), is_active=product.is_active)
    return ProductListItem(**base.model_dump())


def product_to_detail(product: Product) -> ProductDetail:
    """Map sang schema chi tiết (staff/manager)."""

    base = product_to_public(product)
    attrs = product.attributes if isinstance(product.attributes, dict) else {}
    return ProductDetail(
        **base.model_dump(),
        is_active=product.is_active,
        attributes=attrs,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def _build_filter(
    *,
    include_inactive: bool,
    search: str | None,
    category: str | None,
    in_stock_only: bool,
) -> dict[str, Any]:
    """Xây dựng filter MongoDB."""

    query: dict[str, Any] = {}
    if not include_inactive:
        query["is_active"] = True
    if category:
        query["categories"] = category
    if in_stock_only:
        query["stock"] = {"$gt": 0}
    if search:
        query["name"] = {"$regex": re.escape(search.strip()), "$options": "i"}
    return query


def _sort_tuple(sort: str, order: str) -> list[tuple[str, int]]:
    """Chuyển tham số sort thành tuple cho Beanie."""

    allowed = {"created_at", "price", "name"}
    field = sort if sort in allowed else "created_at"
    direction = -1 if order.lower() == "desc" else 1
    return [(field, direction)]


async def list_products(
    *,
    page: int,
    page_size: int,
    include_inactive: bool,
    staff_view: bool = False,
    search: str | None,
    category: str | None,
    in_stock_only: bool,
    min_price: int | None,
    max_price: int | None,
    sort: str,
    order: str,
) -> ProductListResponse:
    """Danh sách sản phẩm có phân trang."""

    query = _build_filter(
        include_inactive=include_inactive,
        search=search,
        category=category,
        in_stock_only=in_stock_only,
    )

    # Lọc giá hiệu lực: lấy rộng hơn rồi lọc trong Python (đủ cho MVP)
    cursor = Product.find(query).sort(_sort_tuple(sort, order))
    all_items = await cursor.to_list()

    if min_price is not None or max_price is not None:
        filtered: list[Product] = []
        for p in all_items:
            effective, _ = compute_effective_price(p.price, p.sale_price)
            if min_price is not None and effective < min_price:
                continue
            if max_price is not None and effective > max_price:
                continue
            filtered.append(p)
        all_items = filtered

    total = len(all_items)
    pages = max(1, math.ceil(total / page_size)) if total > 0 else 0
    start = (page - 1) * page_size
    page_items = all_items[start : start + page_size]

    return ProductListResponse(
        items=[product_to_list_item(p, staff_view=staff_view) for p in page_items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_product_public(product_id: str) -> ProductPublic:
    """Chi tiết sản phẩm đang bán — guest/customer."""

    product = await _get_product_or_404(product_id)
    if not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    return product_to_public(product)


async def get_product_detail(product_id: str, *, allow_inactive: bool) -> ProductDetail:
    """Chi tiết — staff/manager có thể xem SP ẩn."""

    product = await _get_product_or_404(product_id)
    if not allow_inactive and not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    return product_to_detail(product)


async def create_product(data: ProductCreate) -> ProductDetail:
    """Tạo sản phẩm mới."""

    categories = await category_service.validate_category_slugs(data.categories)
    now = utc_now()
    product = Product(
        name=data.name,
        description=data.description,
        price=data.price,
        sale_price=data.sale_price,
        stock=data.stock,
        categories=categories,
        image_urls=data.image_urls,
        display_image_url=data.display_image_url,
        ai_texture_url=data.ai_texture_url,
        attributes=data.attributes,
        is_active=data.is_active,
        created_at=now,
        updated_at=now,
    )
    await product.insert()
    return product_to_detail(product)


async def update_product(product_id: str, data: ProductUpdate) -> ProductDetail:
    """Thay thế toàn bộ sản phẩm."""

    product = await _get_product_or_404(product_id)
    product.name = data.name
    product.description = data.description
    product.price = data.price
    product.sale_price = data.sale_price
    product.stock = data.stock
    product.categories = await category_service.validate_category_slugs(data.categories)
    _apply_images_to_product(
        product,
        image_urls=data.image_urls,
        display_image_url=data.display_image_url,
    )
    product.ai_texture_url = data.ai_texture_url
    product.attributes = data.attributes
    product.is_active = data.is_active
    product.updated_at = utc_now()
    await product.save()
    return product_to_detail(product)


async def patch_product(product_id: str, data: ProductPatch) -> ProductDetail:
    """Cập nhật một phần."""

    product = await _get_product_or_404(product_id)
    updates = data.model_dump(exclude_unset=True)
    if "categories" in updates and updates["categories"] is not None:
        updates["categories"] = await category_service.validate_category_slugs(updates["categories"])

    image_urls = updates.pop("image_urls", None)
    display_image_url = updates.pop("display_image_url", None)
    if image_urls is not None or display_image_url is not None:
        merged_urls = image_urls if image_urls is not None else product.image_urls
        merged_display = display_image_url if display_image_url is not None else product.display_image_url
        _apply_images_to_product(
            product,
            image_urls=merged_urls,
            display_image_url=merged_display,
        )

    for key, value in updates.items():
        setattr(product, key, value)
    if product.sale_price is not None and product.sale_price > product.price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="sale_price không được lớn hơn price",
        )
    product.updated_at = utc_now()
    await product.save()
    return product_to_detail(product)


async def patch_stock(product_id: str, data: ProductStockPatch) -> ProductDetail:
    """Cập nhật tồn kho."""

    product = await _get_product_or_404(product_id)
    product.stock = data.stock
    product.updated_at = utc_now()
    await product.save()
    return product_to_detail(product)


async def deactivate_product(product_id: str) -> ProductDetail:
    """Ẩn sản phẩm (soft delete)."""

    product = await _get_product_or_404(product_id)
    product.is_active = False
    product.updated_at = utc_now()
    await product.save()
    return product_to_detail(product)


async def delete_product_permanent(product_id: str) -> None:
    """
    Xóa vĩnh viễn sản phẩm khỏi database.

    Chỉ áp dụng khi SP đã ẩn, chưa xuất hiện trong đơn hàng.
    """

    product = await _get_product_or_404(product_id)
    if product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cần ẩn sản phẩm trước khi xóa vĩnh viễn",
        )

    oid = product.id
    order_count = await Order.find({"items.product_id": oid}).count()
    if order_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa sản phẩm đã có trong đơn hàng",
        )

    await _remove_product_from_carts(oid)
    await product.delete()


async def _remove_product_from_carts(product_id: PydanticObjectId) -> None:
    """Gỡ SP khỏi mọi giỏ hàng trước khi xóa document."""

    carts = await Cart.find({"items.product_id": product_id}).to_list()
    for cart in carts:
        new_items = [item for item in cart.items if item.product_id != product_id]
        if len(new_items) == len(cart.items):
            continue
        cart.items = new_items
        cart.updated_at = utc_now()
        await cart.save()


async def _get_product_or_404(product_id: str) -> Product:
    """Lấy product hoặc 404."""

    try:
        oid = PydanticObjectId(product_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm",
        ) from exc

    product = await Product.get(oid)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    return product
