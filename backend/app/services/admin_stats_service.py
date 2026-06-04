"""Thống kê admin — aggregation đơn hàng / khách / tồn kho."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from app.api.schemas.admin_stats import (
    AdminOverviewResponse,
    AdminStatsResponse,
    OrderDayStat,
    OrderStatusCount,
)
from app.api.schemas.order import OrderSummary
from app.core.roles import is_manager
from app.models.common import VN_TZ, utc_now
from app.models.enums import OrderStatus, PaymentMethod, PaymentStatus, UserRole
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.services.order_service import _order_to_summary

LOW_STOCK_THRESHOLD = 10

# Đơn đã hủy chỉ tính vào tổng đơn và nhóm trạng thái «cancelled».
_NOT_CANCELLED = {"status": {"$ne": OrderStatus.CANCELLED}}


def _active_orders_filter(period_filter: dict[str, Any]) -> dict[str, Any]:
    """Lọc đơn còn hiệu lực thống kê (không gồm đã hủy)."""

    return {**period_filter, **_NOT_CANCELLED}


def vn_today() -> date:
    return utc_now().astimezone(VN_TZ).date()


def created_at_range_filter(
    from_date: date | None,
    to_date: date | None,
) -> dict[str, Any]:
    """Điều kiện created_at theo ngày lịch VN."""

    if from_date is None and to_date is None:
        return {}
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
        end_exclusive = datetime.combine(
            to_date + timedelta(days=1), time.min, tzinfo=VN_TZ
        ).astimezone(timezone.utc)
        created["$lt"] = end_exclusive
    return {"created_at": created}


def _revenue_expr() -> dict[str, Any]:
    return {
        "$cond": [
            {
                "$and": [
                    {"$eq": ["$payment_status", PaymentStatus.PAID.value]},
                    {"$ne": ["$status", OrderStatus.CANCELLED.value]},
                ]
            },
            "$total_amount",
            0,
        ]
    }


async def _sum_revenue(match: dict[str, Any]) -> int:
    pipeline: list[dict[str, Any]] = []
    if match:
        pipeline.append({"$match": match})
    pipeline.append({"$group": {"_id": None, "total": {"$sum": _revenue_expr()}}})
    rows = await Order.aggregate(pipeline).to_list()
    if not rows:
        return 0
    return int(rows[0].get("total") or 0)


async def get_admin_overview(_current_user: User) -> AdminOverviewResponse:
    today = vn_today()
    today_filter = created_at_range_filter(today, today)

    orders_today = await Order.find(today_filter).count()
    revenue_today = await _sum_revenue(_active_orders_filter(today_filter))

    orders_unpaid = await Order.find(
        {
            "payment_status": PaymentStatus.UNPAID,
            "status": {"$ne": OrderStatus.CANCELLED},
        }
    ).count()

    orders_awaiting_shipment = await Order.find(
        {
            "status": OrderStatus.PENDING,
            "payment_status": PaymentStatus.PAID,
        }
    ).count()

    recent = (
        await Order.find()
        .sort([("created_at", -1)])
        .limit(8)
        .to_list()
    )
    recent_orders = [await _order_to_summary(o) for o in recent]

    return AdminOverviewResponse(
        today=today,
        orders_today=orders_today,
        revenue_today=revenue_today,
        orders_unpaid=orders_unpaid,
        orders_awaiting_shipment=orders_awaiting_shipment,
        recent_orders=recent_orders,
    )


async def get_admin_stats(
    current_user: User,
    *,
    from_date: date | None,
    to_date: date | None,
) -> AdminStatsResponse:
    period_filter = created_at_range_filter(from_date, to_date)
    manager = is_manager(current_user)

    orders_total = await Order.find(period_filter).count()
    revenue_total = await _sum_revenue(_active_orders_filter(period_filter))

    status_pipeline: list[dict[str, Any]] = []
    if period_filter:
        status_pipeline.append({"$match": period_filter})
    status_pipeline.extend(
        [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
    )
    status_rows = await Order.aggregate(status_pipeline).to_list()
    by_status = [
        OrderStatusCount(status=row["_id"], count=int(row["count"]))
        for row in status_rows
        if row.get("_id") is not None
    ]

    day_pipeline: list[dict[str, Any]] = []
    if period_filter:
        day_pipeline.append({"$match": period_filter})
    day_pipeline.extend(
        [
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$created_at",
                            "timezone": "+07:00",
                        }
                    },
                    "order_count": {
                        "$sum": {
                            "$cond": [
                                {"$ne": ["$status", OrderStatus.CANCELLED.value]},
                                1,
                                0,
                            ]
                        }
                    },
                    "revenue": {"$sum": _revenue_expr()},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    )
    day_rows = await Order.aggregate(day_pipeline).to_list()
    by_day = [
        OrderDayStat(
            date=str(row["_id"]),
            order_count=int(row["order_count"]),
            revenue=int(row.get("revenue") or 0),
        )
        for row in day_rows
        if row.get("_id")
        and (
            int(row["order_count"]) > 0 or int(row.get("revenue") or 0) > 0
        )
    ]

    active_filter = _active_orders_filter(period_filter)
    payment_unpaid = await Order.find(
        {**active_filter, "payment_status": PaymentStatus.UNPAID}
    ).count()
    payment_paid = await Order.find(
        {**active_filter, "payment_status": PaymentStatus.PAID}
    ).count()

    payment_offline: int | None = None
    payment_vnpay: int | None = None
    customers_new: int | None = None
    products_low_stock: int | None = None

    if manager:
        payment_offline = await Order.find(
            {**active_filter, "payment_method": PaymentMethod.OFFLINE}
        ).count()
        payment_vnpay = await Order.find(
            {**active_filter, "payment_method": PaymentMethod.VNPAY}
        ).count()

        customer_match: dict[str, Any] = {"role": UserRole.CUSTOMER}
        if period_filter:
            customer_match.update(period_filter)
        customers_new = await User.find(customer_match).count()

        products_low_stock = await Product.find(
            Product.is_active == True,  # noqa: E712
            Product.stock <= LOW_STOCK_THRESHOLD,
        ).count()

    return AdminStatsResponse(
        from_date=from_date,
        to_date=to_date,
        orders_total=orders_total,
        revenue_total=revenue_total,
        by_status=by_status,
        by_day=by_day,
        payment_unpaid=payment_unpaid,
        payment_paid=payment_paid,
        payment_offline=payment_offline,
        payment_vnpay=payment_vnpay,
        customers_new=customers_new,
        products_low_stock=products_low_stock,
    )
