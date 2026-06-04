"""Nghiệp vụ đơn hàng — giỏ / mua ngay, thanh toán offline."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.api.schemas.order import (
    BankInstructions,
    OrderCreateBuyNow,
    OrderCreateFromCart,
    OrderCreateResponse,
    OrderDetail,
    OrderItemPublic,
    OrderListResponse,
    OrderStatusUpdate,
    OrderSummary,
)
from app.core.config import settings
from app.core.roles import is_staff_or_above
from app.models.common import VN_TZ, utc_now
from app.models.enums import (
    ActivityAction,
    OfflineSubtype,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PaymentTransactionStatus,
)
from app.models.order import Order, OrderItem
from app.models.payment_transaction import PaymentTransaction
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.schemas import ShippingAddress
from app.models.user import User
from app.services import audit_service, cart_service, promotion_service
from app.services.product_service import compute_effective_price

_STAFF_STATUS_TARGETS: frozenset[OrderStatus] = frozenset(
    {OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED}
)


@dataclass
class _ResolvedLine:
    product: Product
    quantity: int
    unit_price: int

    @property
    def line_total(self) -> int:
        return self.unit_price * self.quantity


@dataclass
class _StockAdjustment:
    product_id: PydanticObjectId
    quantity: int


async def create_order_from_cart(
    user: User,
    data: OrderCreateFromCart,
    *,
    client_ip: str = "127.0.0.1",
) -> OrderCreateResponse:
    """Đặt hàng từ giỏ — xóa giỏ sau khi thành công."""

    lines = await _resolve_cart_lines(user)
    response = await _create_order(
        user=user,
        lines=lines,
        shipping_address=data.shipping_address,
        payment_method=data.payment_method,
        offline_subtype=data.offline_subtype,
        promotion_code=data.promotion_code,
        client_ip=client_ip,
    )
    await cart_service.clear_cart(user)
    return response


async def create_order_buy_now(
    user: User,
    data: OrderCreateBuyNow,
    *,
    client_ip: str = "127.0.0.1",
) -> OrderCreateResponse:
    """Mua ngay một SP — không thay đổi giỏ."""

    line = await _resolve_buy_now_line(data.product_id, data.quantity)
    return await _create_order(
        user=user,
        lines=[line],
        shipping_address=data.shipping_address,
        payment_method=data.payment_method,
        offline_subtype=data.offline_subtype,
        promotion_code=data.promotion_code,
        client_ip=client_ip,
        log_action=ActivityAction.ORDER_CREATED_BUY_NOW,
        log_extra={"product_id": data.product_id, "quantity": data.quantity},
    )


async def get_order_for_customer(order_id: str, user: User) -> Order:
    """Chi tiết đơn — chỉ chủ đơn (dùng cho thanh toán lại VNPay)."""

    order = await _get_order_or_404(order_id)
    if order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")
    return order


async def cancel_vnpay_expired_order(order: Order, txn: PaymentTransaction) -> None:
    """Hủy đơn VNPay hết hạn — hoàn kho + KM."""

    await _cancel_order(order)
    txn.status = PaymentTransactionStatus.EXPIRED
    await txn.save()
    customer = await User.get(order.user_id)
    if customer is not None:
        await audit_service.log_activity(
            actor=customer,
            action=ActivityAction.ORDER_CANCELLED_VNPAY_EXPIRED,
            customer_id=order.user_id,
            order_id=order.id,
            metadata={
                "order_id": str(order.id),
                "txn_ref": txn.txn_ref,
                "reason": "payment_timeout",
            },
        )


def _apply_order_id_search(query: dict[str, Any], search: str | None) -> dict[str, Any]:
    """Lọc theo _id đầy đủ hoặc hậu tố hex (4–24 ký tự, ví dụ 8 ký tự cuối mã đơn)."""

    if search is None or not search.strip():
        return query
    term = search.strip().lstrip("#")
    try:
        return {**query, "_id": PydanticObjectId(term)}
    except Exception:
        pass
    lowered = term.lower()
    if 4 <= len(lowered) <= 24 and all(c in "0123456789abcdef" for c in lowered):
        return {
            **query,
            "$expr": {
                "$regexMatch": {
                    "input": {"$toString": "$_id"},
                    "regex": f"{lowered}$",
                    "options": "i",
                }
            },
        }
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Mã đơn không hợp lệ — nhập ObjectId hoặc 4–24 ký tự hex cuối mã",
    )


def _apply_created_at_range(
    query: dict[str, Any],
    from_date: date | None,
    to_date: date | None,
) -> dict[str, Any]:
    """Lọc created_at theo ngày lịch (Asia/Ho_Chi_Minh)."""

    if from_date is None and to_date is None:
        return query
    if from_date is not None and to_date is not None and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày bắt đầu phải trước hoặc bằng ngày kết thúc",
        )

    created: dict[str, Any] = {}
    if from_date is not None:
        start = datetime.combine(from_date, time.min, tzinfo=VN_TZ).astimezone(timezone.utc)
        created["$gte"] = start
    if to_date is not None:
        # Cuối ngày "đến" = đầu ngày kế tiếp (exclusive), tránh lệch microsecond.
        end_exclusive = datetime.combine(
            to_date + timedelta(days=1), time.min, tzinfo=VN_TZ
        ).astimezone(timezone.utc)
        created["$lt"] = end_exclusive
    return {**query, "created_at": created}


async def list_orders(
    *,
    current_user: User,
    page: int,
    page_size: int,
    status_filter: OrderStatus | None = None,
    payment_status_filter: PaymentStatus | None = None,
    user_id: str | None = None,
    search: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> OrderListResponse:
    """Customer: đơn của mình. Staff+: có thể lọc user_id."""

    query: dict[str, Any] = {}
    if is_staff_or_above(current_user):
        if user_id is not None:
            query["user_id"] = _parse_object_id(user_id, detail="user_id không hợp lệ")
    else:
        query["user_id"] = current_user.id

    if status_filter is not None:
        query["status"] = status_filter
    if payment_status_filter is not None:
        query["payment_status"] = payment_status_filter

    query = _apply_order_id_search(query, search)
    query = _apply_created_at_range(query, from_date, to_date)

    skip = (page - 1) * page_size
    total = await Order.find(query).count()
    orders = (
        await Order.find(query)
        .sort([("created_at", -1)])
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    return OrderListResponse(
        items=[await _order_to_summary(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_order(order_id: str, current_user: User) -> OrderDetail:
    """Chi tiết đơn — customer chỉ xem của mình."""

    order = await _get_order_or_404(order_id)
    _ensure_can_view_order(order, current_user)
    return await _order_to_detail(order)


async def cancel_order(order_id: str, current_user: User) -> OrderDetail:
    """Customer hủy đơn pending + unpaid."""

    order = await _get_order_or_404(order_id)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền hủy đơn này")
    if order.status != OrderStatus.PENDING or order.payment_status != PaymentStatus.UNPAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ hủy được đơn đang chờ xử lý và chưa thanh toán",
        )
    detail = await _cancel_order(order)
    await audit_service.log_activity(
        actor=current_user,
        action=ActivityAction.ORDER_CANCELLED,
        customer_id=order.user_id,
        order_id=order.id,
        metadata={"order_id": str(order.id), "total_amount": order.total_amount},
    )
    return detail


async def confirm_order_payment(order_id: str, actor: User) -> OrderDetail:
    """Staff xác nhận đã thu tiền (COD / chuyển khoản)."""

    order = await _get_order_or_404(order_id)
    if order.payment_status != PaymentStatus.UNPAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn đã được xác nhận thanh toán",
        )
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xác nhận thanh toán đơn đã hủy",
        )
    if order.payment_method == PaymentMethod.VNPAY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn VNPay được xác nhận tự động qua cổng thanh toán",
        )

    now = utc_now()
    order.payment_status = PaymentStatus.PAID
    order.paid_at = now
    await order.save()
    await audit_service.log_activity(
        actor=actor,
        action=ActivityAction.ORDER_PAYMENT_CONFIRMED,
        customer_id=order.user_id,
        order_id=order.id,
        metadata=audit_service.staff_metadata(
            actor,
            order_id=str(order.id),
            total_amount=order.total_amount,
        ),
    )
    return await _order_to_detail(order)


async def update_order_status(order_id: str, data: OrderStatusUpdate, actor: User) -> OrderDetail:
    """Staff cập nhật shipped / delivered / cancelled."""

    order = await _get_order_or_404(order_id)
    new_status = data.status

    if new_status not in _STAFF_STATUS_TARGETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái không hợp lệ. Dùng payment/confirm để xác nhận thanh toán.",
        )

    if new_status == OrderStatus.CANCELLED:
        if order.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể hủy đơn đã giao",
            )
        if order.status == OrderStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đơn đã bị hủy")
        detail = await _cancel_order(order)
        await audit_service.log_activity(
            actor=actor,
            action=ActivityAction.ORDER_CANCELLED_BY_STAFF,
            customer_id=order.user_id,
            order_id=order.id,
            metadata=audit_service.staff_metadata(
                actor,
                order_id=str(order.id),
                reason=data.reason,
                total_amount=order.total_amount,
            ),
        )
        return detail

    if order.payment_status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ xử lý giao hàng khi đã thanh toán",
        )

    if new_status == OrderStatus.SHIPPED:
        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ chuyển shipped từ đơn đang chờ giao (pending)",
            )
    elif new_status == OrderStatus.DELIVERED:
        if order.status != OrderStatus.SHIPPED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ chuyển delivered từ đơn đã shipped",
            )

    order.status = new_status
    await order.save()

    action_map = {
        OrderStatus.SHIPPED: ActivityAction.ORDER_SHIPPED,
        OrderStatus.DELIVERED: ActivityAction.ORDER_DELIVERED,
    }
    log_action = action_map.get(new_status)
    if log_action is not None:
        await audit_service.log_activity(
            actor=actor,
            action=log_action,
            customer_id=order.user_id,
            order_id=order.id,
            metadata=audit_service.staff_metadata(actor, order_id=str(order.id)),
        )

    return await _order_to_detail(order)


async def _create_order(
    *,
    user: User,
    lines: list[_ResolvedLine],
    shipping_address: ShippingAddress,
    payment_method: PaymentMethod,
    offline_subtype: OfflineSubtype | None,
    promotion_code: str | None,
    client_ip: str,
    log_action: ActivityAction = ActivityAction.ORDER_CREATED,
    log_extra: dict[str, Any] | None = None,
) -> OrderCreateResponse:
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giỏ hàng trống")

    subtype = offline_subtype or OfflineSubtype.COD
    if payment_method == PaymentMethod.VNPAY:
        subtype = OfflineSubtype.COD

    subtotal = sum(line.line_total for line in lines)
    promotion_id: PydanticObjectId | None = None
    discount_amount = 0

    if promotion_code:
        promotion, discount_amount = await promotion_service.resolve_promotion_for_order(
            code=promotion_code,
            subtotal=subtotal,
        )
        promotion_id = promotion.id

    stock_adjustments: list[_StockAdjustment] = []
    promo_reserved = False

    try:
        for line in lines:
            await _decrement_stock(line.product.id, line.quantity)
            stock_adjustments.append(
                _StockAdjustment(product_id=line.product.id, quantity=line.quantity)
            )

        if promotion_id is not None:
            await promotion_service.increment_promotion_used_count(promotion_id)
            promo_reserved = True

        order_items = [
            OrderItem(
                product_id=line.product.id,
                product_name=line.product.name,
                quantity=line.quantity,
                unit_price=line.unit_price,
            )
            for line in lines
        ]
        total_amount = subtotal - discount_amount

        order = Order(
            user_id=user.id,
            items=order_items,
            subtotal=subtotal,
            promotion_id=promotion_id,
            discount_amount=discount_amount,
            total_amount=total_amount,
            shipping_address=shipping_address,
            status=OrderStatus.PENDING,
            payment_method=payment_method,
            payment_status=PaymentStatus.UNPAID,
            offline_subtype=subtype,
        )
        await order.insert()
    except Exception:
        await _rollback_stock(stock_adjustments)
        if promo_reserved and promotion_id is not None:
            await promotion_service.decrement_promotion_used_count(promotion_id)
        raise

    detail = await _order_to_detail(order)
    meta: dict = {
        "order_id": str(order.id),
        "total_amount": order.total_amount,
        "item_count": sum(i.quantity for i in order.items),
        "payment_method": payment_method.value,
        "offline_subtype": subtype.value,
    }
    if log_extra:
        meta.update(log_extra)
    await audit_service.log_activity(
        actor=user,
        action=log_action,
        customer_id=user.id,
        order_id=order.id,
        metadata=meta,
    )
    bank = None
    vnpay_info = None
    if payment_method == PaymentMethod.OFFLINE and subtype == OfflineSubtype.BANK:
        bank = _bank_instructions(order)
    elif payment_method == PaymentMethod.VNPAY:
        from app.services import vnpay_service

        vnpay_info = await vnpay_service.create_payment_session(order, client_ip=client_ip)
    return OrderCreateResponse(order=detail, bank_instructions=bank, vnpay=vnpay_info)


async def _cancel_order(order: Order) -> OrderDetail:
    """Hủy đơn và hoàn stock + lượt mã KM."""

    await _restore_order_inventory(order)
    order.status = OrderStatus.CANCELLED
    await order.save()
    return await _order_to_detail(order)


async def _restore_order_inventory(order: Order) -> None:
    for item in order.items:
        await _increment_stock(item.product_id, item.quantity)
    if order.promotion_id is not None:
        await promotion_service.decrement_promotion_used_count(order.promotion_id)


async def _resolve_cart_lines(user: User) -> list[_ResolvedLine]:
    raw = await cart_service.resolve_cart_lines_for_order(user)
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giỏ hàng trống")
    return [_line_from_product(p, q) for p, q in raw]


async def _resolve_buy_now_line(product_id: str, quantity: int) -> _ResolvedLine:
    oid = _parse_object_id(product_id, detail="Không tìm thấy sản phẩm")
    product = await Product.get(oid)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sản phẩm không còn được bán",
        )
    if quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số lượng vượt tồn kho ({product.stock})",
        )
    return _line_from_product(product, quantity)


def _line_from_product(product: Product, quantity: int) -> _ResolvedLine:
    unit_price, _ = compute_effective_price(product.price, product.sale_price)
    return _ResolvedLine(product=product, quantity=quantity, unit_price=unit_price)


async def _decrement_stock(product_id: PydanticObjectId, quantity: int) -> None:
    collection = Product.get_pymongo_collection()
    result = await collection.find_one_and_update(
        {"_id": product_id, "is_active": True, "stock": {"$gte": quantity}},
        {"$inc": {"stock": -quantity}},
        return_document=ReturnDocument.AFTER,
    )
    if result is None:
        product = await Product.get(product_id)
        name = product.name if product else "sản phẩm"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không đủ tồn kho cho {name}",
        )


async def _increment_stock(product_id: PydanticObjectId, quantity: int) -> None:
    collection = Product.get_pymongo_collection()
    await collection.update_one({"_id": product_id}, {"$inc": {"stock": quantity}})


async def _rollback_stock(adjustments: list[_StockAdjustment]) -> None:
    for adj in reversed(adjustments):
        await _increment_stock(adj.product_id, adj.quantity)


def _bank_instructions(order: Order) -> BankInstructions | None:
    if not settings.BANK_ACCOUNT_NUMBER:
        return None
    order_ref = str(order.id)
    note = f"{settings.BANK_TRANSFER_NOTE_PREFIX} {order_ref}".strip()
    return BankInstructions(
        bank_name=settings.BANK_NAME,
        account_number=settings.BANK_ACCOUNT_NUMBER,
        account_holder=settings.BANK_ACCOUNT_HOLDER,
        transfer_note=note,
        order_id=order_ref,
    )


async def _order_to_summary(order: Order) -> OrderSummary:
    item_count = sum(i.quantity for i in order.items)
    return OrderSummary(
        id=str(order.id),
        status=order.status,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        offline_subtype=order.offline_subtype,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        item_count=item_count,
        created_at=order.created_at,
        paid_at=order.paid_at,
    )


async def _order_to_detail(order: Order) -> OrderDetail:
    summary = await _order_to_summary(order)
    promotion_code: str | None = None
    if order.promotion_id is not None:
        promo = await Promotion.get(order.promotion_id)
        if promo is not None:
            promotion_code = promo.code

    items = [
        OrderItemPublic(
            product_id=str(i.product_id),
            product_name=i.product_name,
            quantity=i.quantity,
            unit_price=i.unit_price,
            line_total=i.unit_price * i.quantity,
        )
        for i in order.items
    ]

    return OrderDetail(
        **summary.model_dump(),
        user_id=str(order.user_id),
        items=items,
        promotion_id=str(order.promotion_id) if order.promotion_id else None,
        promotion_code=promotion_code,
        shipping_address=order.shipping_address,
    )


def _ensure_can_view_order(order: Order, user: User) -> None:
    if is_staff_or_above(user):
        return
    if order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem đơn này")


async def delete_order_permanent(order_id: str) -> None:
    """
    Xóa vĩnh viễn đơn hàng khỏi database.

    Chỉ áp dụng khi đơn đã hủy (cancelled). Nhật ký activity giữ nguyên.
    """

    order = await _get_order_or_404(order_id)
    if order.status != OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ xóa vĩnh viễn đơn đã hủy",
        )

    oid = order.id
    await PaymentTransaction.find(PaymentTransaction.order_id == oid).delete()
    await order.delete()


async def _get_order_or_404(order_id: str) -> Order:
    oid = _parse_object_id(order_id, detail="Không tìm thấy đơn hàng")
    order = await Order.get(oid)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn hàng")
    return order


def _parse_object_id(value: str, *, detail: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
