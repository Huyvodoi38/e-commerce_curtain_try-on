"""Router mã khuyến mãi — quản lý + validate."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import get_current_active_user, require_manager, require_staff
from app.api.schemas.promotion import (
    PromotionCreate,
    PromotionDetail,
    PromotionListResponse,
    PromotionPatch,
    PromotionUpdate,
    PromotionValidateRequest,
    PromotionValidateResponse,
)
from app.core.roles import is_manager
from app.models.user import User
from app.services import promotion_service

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("", response_model=PromotionListResponse)
async def list_promotions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    include_inactive: bool = False,
    current_user: User = Depends(require_staff),
) -> PromotionListResponse:
    """
    Danh sách mã KM — nhân viên / quản lý.

    Staff: chỉ mã active. Manager: include_inactive=true để xem mã đã ẩn.
    """

    if include_inactive and not is_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="include_inactive chỉ dành cho quản lý",
        )

    return await promotion_service.list_promotions(
        page=page,
        page_size=page_size,
        include_inactive=include_inactive and is_manager(current_user),
        search=search,
    )


@router.post("/validate", response_model=PromotionValidateResponse)
async def validate_promotion(
    data: PromotionValidateRequest,
    _: User = Depends(get_current_active_user),
) -> PromotionValidateResponse:
    """Kiểm tra mã + ước tính giảm — customer / staff / manager."""

    return await promotion_service.validate_promotion_code(
        code=data.code,
        subtotal=data.subtotal,
    )


@router.get("/{promotion_id}", response_model=PromotionDetail)
async def get_promotion(
    promotion_id: str,
    current_user: User = Depends(require_staff),
) -> PromotionDetail:
    """Chi tiết mã KM."""

    allow_inactive = is_manager(current_user)
    return await promotion_service.get_promotion_detail(
        promotion_id,
        allow_inactive=allow_inactive,
    )


@router.post("", response_model=PromotionDetail, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    data: PromotionCreate,
    _: User = Depends(require_manager),
) -> PromotionDetail:
    """Tạo mã KM — quản lý."""

    return await promotion_service.create_promotion(data)


@router.put("/{promotion_id}", response_model=PromotionDetail)
async def update_promotion(
    promotion_id: str,
    data: PromotionUpdate,
    _: User = Depends(require_manager),
) -> PromotionDetail:
    """Cập nhật toàn bộ — quản lý."""

    return await promotion_service.update_promotion(promotion_id, data)


@router.patch("/{promotion_id}", response_model=PromotionDetail)
async def patch_promotion(
    promotion_id: str,
    data: PromotionPatch,
    _: User = Depends(require_manager),
) -> PromotionDetail:
    """Cập nhật một phần — quản lý."""

    return await promotion_service.patch_promotion(promotion_id, data)


@router.delete("/{promotion_id}", response_model=PromotionDetail)
async def delete_promotion(
    promotion_id: str,
    _: User = Depends(require_manager),
) -> PromotionDetail:
    """Ẩn mã KM (soft delete) — quản lý."""

    return await promotion_service.deactivate_promotion(promotion_id)
