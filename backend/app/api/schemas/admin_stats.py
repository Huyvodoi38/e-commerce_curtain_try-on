"""Schema API thống kê / trang chủ admin."""

from datetime import date

from pydantic import BaseModel

from app.api.schemas.order import OrderSummary
from app.models.enums import OrderStatus


class OrderStatusCount(BaseModel):
    status: OrderStatus
    count: int


class OrderDayStat(BaseModel):
    date: str
    order_count: int
    revenue: int


class AdminOverviewResponse(BaseModel):
    """Tóm tắt nhanh cho trang chủ admin — KPI hôm nay + việc cần xử lý."""

    today: date
    orders_today: int
    revenue_today: int
    orders_unpaid: int
    orders_awaiting_shipment: int
    recent_orders: list[OrderSummary]


class AdminStatsResponse(BaseModel):
    """Thống kê theo khoảng ngày (giờ Việt Nam)."""

    from_date: date | None = None
    to_date: date | None = None
    orders_total: int
    revenue_total: int
    by_status: list[OrderStatusCount]
    by_day: list[OrderDayStat]
    payment_unpaid: int
    payment_paid: int
    payment_offline: int | None = None
    payment_vnpay: int | None = None
    customers_new: int | None = None
    products_low_stock: int | None = None
