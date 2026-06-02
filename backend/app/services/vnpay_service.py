"""VNPay — tạo URL thanh toán, IPN, hết hạn tự hủy đơn."""

from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.api.schemas.order import VnpayPaymentInfo
from app.core.config import settings
from app.models.common import utc_now
from app.models.enums import (
    ActivityAction,
    OrderStatus,
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
    PaymentTransactionStatus,
)
from app.models.order import Order
from app.models.payment_transaction import PaymentTransaction
from app.models.user import User
from app.payments.vnpay.signing import build_payment_query_string, verify_secure_hash
from app.services import audit_service

_VNPAY_SUCCESS_CODE = "00"


def _log_ipn(event: str, **fields: object) -> None:
    payload = " ".join(f"{k}={v}" for k, v in fields.items())
    print(f"[VNPAY_IPN] event={event} {payload}".strip())


def _require_vnpay_config() -> None:
    if not settings.vnpay_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VNPay chưa được cấu hình (VNPAY_TMN_CODE, VNPAY_HASH_SECRET)",
        )
    if not settings.VNPAY_IPN_URL.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Thiếu VNPAY_IPN_URL (URL public cho IPN, vd. ngrok)",
        )


def _format_vnpay_datetime(dt) -> str:
    from zoneinfo import ZoneInfo

    vn = dt.astimezone(ZoneInfo("Asia/Ho_Chi_Minh"))
    return vn.strftime("%Y%m%d%H%M%S")


def _new_txn_ref(order_id: PydanticObjectId) -> str:
    suffix = secrets.token_hex(4)
    return f"{str(order_id)[-12:]}{suffix}"[:32]


def build_payment_url(
    *,
    txn_ref: str,
    amount_vnd: int,
    order_info: str,
    client_ip: str,
    return_url: str,
    create_at,
    expire_at,
) -> str:
    params: dict[str, Any] = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.VNPAY_TMN_CODE,
        "vnp_Amount": amount_vnd * 100,
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": txn_ref,
        "vnp_OrderInfo": order_info[:255],
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": return_url,
        "vnp_IpAddr": client_ip or "127.0.0.1",
        "vnp_CreateDate": _format_vnpay_datetime(create_at),
        "vnp_ExpireDate": _format_vnpay_datetime(expire_at),
    }
    query = build_payment_query_string(params, settings.VNPAY_HASH_SECRET)
    base = settings.VNPAY_PAY_URL.rstrip("?")
    return f"{base}?{query}"


async def create_payment_session(
    order: Order,
    *,
    client_ip: str,
) -> VnpayPaymentInfo:
    """Tạo phiên VNPay mới cho đơn pending + unpaid."""

    _require_vnpay_config()
    if order.payment_method != PaymentMethod.VNPAY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đơn không dùng VNPay")
    if order.status != OrderStatus.PENDING or order.payment_status != PaymentStatus.UNPAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ thanh toán lại đơn đang chờ thanh toán",
        )

    now = utc_now()
    expires = now + timedelta(minutes=settings.VNPAY_EXPIRE_MINUTES)
    txn_ref = _new_txn_ref(order.id)

    txn = PaymentTransaction(
        order_id=order.id,
        provider=PaymentProvider.VNPAY,
        txn_ref=txn_ref,
        amount=order.total_amount,
        status=PaymentTransactionStatus.INITIATED,
        expires_at=expires,
    )
    await txn.insert()

    order_info = f"Thanh toan don {order.id}"
    payment_url = build_payment_url(
        txn_ref=txn_ref,
        amount_vnd=order.total_amount,
        order_info=order_info,
        client_ip=client_ip,
        return_url=settings.vnpay_return_url(str(order.id)),
        create_at=now,
        expire_at=expires,
    )
    return VnpayPaymentInfo(payment_url=payment_url, expires_at=expires, txn_ref=txn_ref)


async def handle_ipn(query: dict[str, Any]) -> dict[str, str]:
    """Xử lý IPN VNPay — trả RspCode/Message theo spec."""

    txn_ref = str(query.get("vnp_TxnRef", ""))
    response_code = str(query.get("vnp_ResponseCode", ""))
    _log_ipn("received", txn_ref=txn_ref or "-", response_code=response_code or "-")

    if not settings.vnpay_enabled:
        _log_ipn("reject_not_configured", txn_ref=txn_ref or "-")
        return {"RspCode": "99", "Message": "VNPay not configured"}

    params = {k: v for k, v in query.items() if k.startswith("vnp_")}
    if not verify_secure_hash(params, settings.VNPAY_HASH_SECRET):
        _log_ipn("reject_invalid_signature", txn_ref=txn_ref or "-")
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = str(params.get("vnp_TxnRef", ""))
    response_code = str(params.get("vnp_ResponseCode", ""))
    txn_no = str(params.get("vnp_TransactionNo", "") or "")

    txn = await PaymentTransaction.find_one(PaymentTransaction.txn_ref == txn_ref)
    if txn is None:
        _log_ipn("reject_txn_not_found", txn_ref=txn_ref or "-")
        return {"RspCode": "01", "Message": "Order not found"}

    order = await Order.get(txn.order_id)
    if order is None:
        _log_ipn("reject_order_not_found", txn_ref=txn_ref or "-")
        return {"RspCode": "01", "Message": "Order not found"}

    try:
        amount_paid = int(params.get("vnp_Amount", 0))
    except (TypeError, ValueError):
        _log_ipn("reject_amount_parse_failed", txn_ref=txn_ref or "-", amount=params.get("vnp_Amount", "-"))
        return {"RspCode": "04", "Message": "Invalid amount"}

    if amount_paid != order.total_amount * 100:
        _log_ipn(
            "reject_amount_mismatch",
            txn_ref=txn_ref or "-",
            paid=amount_paid,
            expected=order.total_amount * 100,
        )
        return {"RspCode": "04", "Message": "Invalid amount"}

    if txn.status == PaymentTransactionStatus.SUCCESS:
        _log_ipn("already_success", txn_ref=txn_ref or "-", txn_no=txn_no or "-")
        return {"RspCode": "00", "Message": "Confirm Success"}

    if order.payment_status == PaymentStatus.PAID:
        txn.status = PaymentTransactionStatus.SUCCESS
        txn.vnp_transaction_no = txn_no or txn.vnp_transaction_no
        await txn.save()
        _log_ipn("order_already_paid", txn_ref=txn_ref or "-", txn_no=txn_no or "-")
        return {"RspCode": "00", "Message": "Confirm Success"}

    if order.status == OrderStatus.CANCELLED:
        txn.status = PaymentTransactionStatus.FAILED
        await txn.save()
        _log_ipn("reject_order_cancelled", txn_ref=txn_ref or "-", txn_no=txn_no or "-")
        return {"RspCode": "02", "Message": "Order cancelled"}

    if response_code != _VNPAY_SUCCESS_CODE:
        txn.status = PaymentTransactionStatus.FAILED
        await txn.save()
        _log_ipn("mark_failed_response_code", txn_ref=txn_ref or "-", response_code=response_code or "-")
        return {"RspCode": "00", "Message": "Confirm Success"}

    now = utc_now()
    order.payment_status = PaymentStatus.PAID
    order.paid_at = now
    await order.save()

    txn.status = PaymentTransactionStatus.SUCCESS
    txn.vnp_transaction_no = txn_no
    txn.paid_at = now
    await txn.save()
    _log_ipn("mark_paid_success", txn_ref=txn_ref or "-", txn_no=txn_no or "-", order_id=order.id)

    from app.models.user import User

    customer = await User.get(order.user_id)
    if customer is not None:
        await audit_service.log_activity(
            actor=customer,
            action=ActivityAction.ORDER_PAYMENT_VNPAY,
            customer_id=order.user_id,
            order_id=order.id,
            metadata={
                "order_id": str(order.id),
                "txn_ref": txn_ref,
                "vnp_transaction_no": txn_no,
                "total_amount": order.total_amount,
                "source": "vnpay_ipn",
            },
        )
    return {"RspCode": "00", "Message": "Confirm Success"}


async def expire_unpaid_vnpay_orders() -> int:
    """Hủy đơn VNPay quá hạn thanh toán — gọi định kỳ từ background task."""

    from app.services.order_service import cancel_vnpay_expired_order

    now = utc_now()
    stale_txns = await PaymentTransaction.find(
        PaymentTransaction.status == PaymentTransactionStatus.INITIATED,
        PaymentTransaction.expires_at < now,
    ).to_list()

    count = 0
    for txn in stale_txns:
        order = await Order.get(txn.order_id)
        if order is None:
            txn.status = PaymentTransactionStatus.EXPIRED
            await txn.save()
            continue
        if (
            order.payment_method == PaymentMethod.VNPAY
            and order.status == OrderStatus.PENDING
            and order.payment_status == PaymentStatus.UNPAID
        ):
            await cancel_vnpay_expired_order(order, txn)
            count += 1
        else:
            txn.status = PaymentTransactionStatus.EXPIRED
            await txn.save()
    return count


async def recreate_payment_for_order(
    order_id: str,
    user: User,
    *,
    client_ip: str,
) -> VnpayPaymentInfo:
    """Customer tạo lại link VNPay (sau hết hạn / lỗi)."""

    from app.services.order_service import get_order_for_customer

    order = await get_order_for_customer(order_id, user)
    return await create_payment_session(order, client_ip=client_ip)
