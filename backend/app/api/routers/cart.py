"""Router giỏ hàng — chỉ khách hàng đăng nhập."""

from fastapi import APIRouter, Depends, status

from app.api.dependencies import require_customer
from app.api.schemas.cart import (
    CartItemInput,
    CartItemQuantityPatch,
    CartItemsReplaceRequest,
    CartResponse,
)
from app.models.user import User
from app.services import cart_service

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def get_cart(current_user: User = Depends(require_customer)) -> CartResponse:
    """Lấy giỏ — tự xóa SP không còn bán."""

    return await cart_service.get_cart(current_user)


@router.put("/items", response_model=CartResponse)
async def replace_cart_items(
    data: CartItemsReplaceRequest,
    current_user: User = Depends(require_customer),
) -> CartResponse:
    """Thay toàn bộ giỏ (đồng bộ đa thiết bị)."""

    return await cart_service.replace_cart_items(current_user, data.items)


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_200_OK)
async def add_cart_item(
    data: CartItemInput,
    current_user: User = Depends(require_customer),
) -> CartResponse:
    """Thêm SP hoặc cộng dồn số lượng."""

    return await cart_service.add_cart_item(current_user, data)


@router.patch("/items/{product_id}", response_model=CartResponse)
async def patch_cart_item_quantity(
    product_id: str,
    data: CartItemQuantityPatch,
    current_user: User = Depends(require_customer),
) -> CartResponse:
    """Đổi số lượng; quantity=0 để xóa."""

    return await cart_service.set_cart_item_quantity(
        current_user,
        product_id,
        data.quantity,
    )


@router.delete("/items/{product_id}", response_model=CartResponse)
async def delete_cart_item(
    product_id: str,
    current_user: User = Depends(require_customer),
) -> CartResponse:
    """Xóa một SP."""

    return await cart_service.remove_cart_item(current_user, product_id)


@router.delete("", response_model=CartResponse)
async def clear_cart(current_user: User = Depends(require_customer)) -> CartResponse:
    """Xóa sạch giỏ."""

    return await cart_service.clear_cart(current_user)
