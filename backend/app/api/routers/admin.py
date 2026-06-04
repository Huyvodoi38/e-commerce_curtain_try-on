"""Router trang chủ & thống kê admin."""

from datetime import date

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import require_staff
from app.api.schemas.admin_stats import AdminOverviewResponse, AdminStatsResponse
from app.models.user import User
from app.services import admin_stats_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    current_user: User = Depends(require_staff),
) -> AdminOverviewResponse:
    """KPI hôm nay, đơn cần xử lý, đơn gần đây."""

    return await admin_stats_service.get_admin_overview(current_user)


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(require_staff),
) -> AdminStatsResponse:
    """Thống kê đơn hàng theo khoảng ngày (giờ Việt Nam)."""

    return await admin_stats_service.get_admin_stats(
        current_user,
        from_date=from_date,
        to_date=to_date,
    )
