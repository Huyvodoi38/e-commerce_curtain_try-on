"""Router activity log."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import require_staff
from app.api.schemas.activity_log import ActivityLogListResponse
from app.models.enums import ActivityAction
from app.models.user import User
from app.services import audit_service

router = APIRouter(tags=["audit-logs"])


@router.get("/audit-logs", response_model=ActivityLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str | None = None,
    order_id: str | None = None,
    actor_id: str | None = None,
    action: ActivityAction | None = None,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    current_user: User = Depends(require_staff),
) -> ActivityLogListResponse:
    """
    Staff: mọi log có customer_id (timeline khách).
    Manager: toàn bộ log.
    """

    return await audit_service.list_activity_logs(
        current_user=current_user,
        page=page,
        page_size=page_size,
        customer_id=customer_id,
        order_id=order_id,
        actor_id=actor_id,
        action=action,
        from_date=from_date,
        to_date=to_date,
    )

