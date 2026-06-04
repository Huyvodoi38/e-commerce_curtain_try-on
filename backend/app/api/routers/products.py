"""Router sản phẩm rèm — catalog gộp + CRUD quản lý."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import get_optional_active_user, require_manager, require_staff
from app.api.schemas.product import (
    ProductCreate,
    ProductDetail,
    ProductListResponse,
    ProductPatch,
    ProductPublic,
    ProductStockPatch,
    ProductUpdate,
)
from app.core.roles import is_staff_or_above
from app.models.user import User
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse, response_model_exclude_none=True)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category: str | None = None,
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    in_stock_only: bool = False,
    sort: str = Query("created_at", pattern="^(created_at|price|name)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    include_inactive: bool = False,
    current_user: User | None = Depends(get_optional_active_user),
) -> ProductListResponse:
    """
    Danh sách sản phẩm.

    - Guest/customer: chỉ sản phẩm đang bán (is_active=true).
    - Staff/manager: include_inactive=true để xem cả SP đã ẩn.
    """

    staff_view = current_user is not None and is_staff_or_above(current_user)
    if include_inactive and not staff_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="include_inactive chỉ dành cho nhân viên hoặc quản lý",
        )

    return await product_service.list_products(
        page=page,
        page_size=page_size,
        include_inactive=include_inactive and staff_view,
        staff_view=staff_view,
        search=search,
        category=category,
        in_stock_only=in_stock_only,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        order=order,
    )


@router.get("/{product_id}", response_model=ProductDetail | ProductPublic)
async def get_product(
    product_id: str,
    current_user: User | None = Depends(get_optional_active_user),
) -> ProductDetail | ProductPublic:
    """Chi tiết — staff/manager xem được SP ẩn; guest chỉ SP đang bán."""

    if current_user is not None and is_staff_or_above(current_user):
        return await product_service.get_product_detail(
            product_id,
            allow_inactive=True,
        )
    return await product_service.get_product_public(product_id)


@router.post("", response_model=ProductDetail, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    _: User = Depends(require_manager),
) -> ProductDetail:
    """Tạo sản phẩm — quản lý."""

    return await product_service.create_product(data)


@router.put("/{product_id}", response_model=ProductDetail)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    _: User = Depends(require_manager),
) -> ProductDetail:
    """Cập nhật toàn bộ — quản lý."""

    return await product_service.update_product(product_id, data)


@router.patch("/{product_id}", response_model=ProductDetail)
async def patch_product(
    product_id: str,
    data: ProductPatch,
    _: User = Depends(require_manager),
) -> ProductDetail:
    """Cập nhật một phần — quản lý."""

    return await product_service.patch_product(product_id, data)


@router.patch("/{product_id}/stock", response_model=ProductDetail)
async def patch_product_stock(
    product_id: str,
    data: ProductStockPatch,
    _: User = Depends(require_staff),
) -> ProductDetail:
    """Cập nhật tồn kho — nhân viên hoặc quản lý."""

    return await product_service.patch_stock(product_id, data)


@router.delete("/{product_id}", response_model=ProductDetail)
async def delete_product(
    product_id: str,
    _: User = Depends(require_manager),
) -> ProductDetail:
    """Ẩn sản phẩm (soft delete) — quản lý."""

    return await product_service.deactivate_product(product_id)


@router.delete("/{product_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_permanent(
    product_id: str,
    _: User = Depends(require_manager),
) -> None:
    """Xóa vĩnh viễn — chỉ SP đã ẩn và chưa có trong đơn hàng."""

    await product_service.delete_product_permanent(product_id)
