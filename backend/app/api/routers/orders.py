"""Router đơn hàng — customer đặt / staff xử lý."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.api.dependencies import get_current_active_user, require_customer, require_manager, require_staff
from app.api.schemas.order import (
    OrderCreateBuyNow,
    OrderCreateFromCart,
    OrderCreateResponse,
    OrderDetail,
    OrderListResponse,
    OrderStatusUpdate,
    VnpayPaymentInfo,
)
from app.core.roles import is_staff_or_above
from app.models.enums import OrderStatus
from app.models.user import User
from app.services import order_service, vnpay_service

router = APIRouter(prefix="/orders", tags=["orders"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.post("", response_model=OrderCreateResponse, status_code=201)
async def create_order_from_cart(
    data: OrderCreateFromCart,
    request: Request,
    current_user: User = Depends(require_customer),
) -> OrderCreateResponse:
    """Đặt hàng từ giỏ — offline (COD/bank) hoặc VNPay."""

    return await order_service.create_order_from_cart(
        current_user, data, client_ip=_client_ip(request)
    )


@router.post("/buy-now", response_model=OrderCreateResponse, status_code=201)
async def create_order_buy_now(
    data: OrderCreateBuyNow,
    request: Request,
    current_user: User = Depends(require_customer),
) -> OrderCreateResponse:
    """Mua ngay một sản phẩm — không thay đổi giỏ."""

    return await order_service.create_order_buy_now(
        current_user, data, client_ip=_client_ip(request)
    )


@router.post("/{order_id}/payments/vnpay", response_model=VnpayPaymentInfo)
async def create_vnpay_payment_session(
    order_id: str,
    request: Request,
    current_user: User = Depends(require_customer),
) -> VnpayPaymentInfo:
    """Tạo lại link VNPay (sau hết hạn 15 phút hoặc lỗi thanh toán)."""

    return await vnpay_service.recreate_payment_for_order(
        order_id, current_user, client_ip=_client_ip(request)
    )


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: OrderStatus | None = Query(None, alias="status"),
    user_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
) -> OrderListResponse:
    """Customer: đơn của mình. Staff+: lọc theo user_id / status."""

    if user_id is not None and not is_staff_or_above(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhân viên mới lọc theo user_id",
        )

    return await order_service.list_orders(
        current_user=current_user,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        user_id=user_id,
    )


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_active_user),
) -> OrderDetail:
    """Chi tiết đơn."""

    return await order_service.get_order(order_id, current_user)


@router.patch("/{order_id}/cancel", response_model=OrderDetail)
async def cancel_order(
    order_id: str,
    current_user: User = Depends(require_customer),
) -> OrderDetail:
    """Khách hủy đơn pending + chưa thanh toán."""

    return await order_service.cancel_order(order_id, current_user)


@router.patch("/{order_id}/payment/confirm", response_model=OrderDetail)
async def confirm_order_payment(
    order_id: str,
    staff: User = Depends(require_staff),
) -> OrderDetail:
    """Nhân viên xác nhận đã thu tiền (COD / chuyển khoản)."""

    return await order_service.confirm_order_payment(order_id, staff)


@router.patch("/{order_id}/status", response_model=OrderDetail)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    staff: User = Depends(require_staff),
) -> OrderDetail:
    """Nhân viên: shipped, delivered, cancelled."""

    return await order_service.update_order_status(order_id, data, staff)


@router.delete("/{order_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_permanent(
    order_id: str,
    _: User = Depends(require_manager),
) -> None:
    """Xóa vĩnh viễn — chỉ đơn đã hủy, quản lý."""

    await order_service.delete_order_permanent(order_id)
