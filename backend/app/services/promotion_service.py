"""Nghiệp vụ mã khuyến mãi."""

import math
import re
from datetime import datetime, timezone
from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.api.schemas.promotion import (
    PromotionCreate,
    PromotionDetail,
    PromotionListResponse,
    PromotionPatch,
    PromotionSummary,
    PromotionUpdate,
    PromotionValidateResponse,
    normalize_promotion_code,
)
from app.models.common import utc_now
from app.models.enums import DiscountType
from app.models.promotion import Promotion


def _as_utc(dt: datetime) -> datetime:
    """Chuẩn hóa datetime để so sánh (MongoDB có thể trả naive UTC)."""

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _validate_promotion_state(promotion: Promotion) -> None:
    """Kiểm tra rule nghiệp vụ sau create/update/patch."""

    if promotion.end_date <= promotion.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date phải sau start_date",
        )
    if promotion.discount_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="discount_value phải lớn hơn 0",
        )
    if promotion.discount_type == DiscountType.PERCENTAGE and promotion.discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Giảm % không được vượt quá 100",
        )
    if promotion.max_discount_amount is not None and promotion.max_discount_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="max_discount_amount phải lớn hơn 0",
        )


def calculate_discount(subtotal: int, promotion: Promotion) -> int:
    """Tính số tiền giảm (VND) từ subtotal và mã KM."""

    if promotion.discount_type == DiscountType.PERCENTAGE:
        amount = subtotal * promotion.discount_value // 100
        if promotion.max_discount_amount is not None:
            amount = min(amount, promotion.max_discount_amount)
    else:
        amount = promotion.discount_value
    return min(max(0, amount), subtotal)


def promotion_to_summary(promotion: Promotion) -> PromotionSummary:
    """Map sang schema danh sách."""

    return PromotionSummary(
        id=str(promotion.id),
        code=promotion.code,
        description=promotion.description,
        discount_type=promotion.discount_type,
        discount_value=promotion.discount_value,
        min_order_value=promotion.min_order_value,
        start_date=promotion.start_date,
        end_date=promotion.end_date,
        is_active=promotion.is_active,
        used_count=promotion.used_count,
        usage_limit=promotion.usage_limit,
    )


def promotion_to_detail(promotion: Promotion) -> PromotionDetail:
    """Map sang schema chi tiết."""

    base = promotion_to_summary(promotion)
    return PromotionDetail(
        **base.model_dump(),
        max_discount_amount=promotion.max_discount_amount,
    )


def _build_list_filter(*, include_inactive: bool, search: str | None) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if not include_inactive:
        query["is_active"] = True
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"code": {"$regex": pattern, "$options": "i"}},
            {"description": {"$regex": pattern, "$options": "i"}},
        ]
    return query


async def list_promotions(
    *,
    page: int,
    page_size: int,
    include_inactive: bool,
    search: str | None,
) -> PromotionListResponse:
    """Danh sách mã KM — staff/manager."""

    query = _build_list_filter(include_inactive=include_inactive, search=search)
    cursor = Promotion.find(query).sort([("start_date", -1)])
    all_items = await cursor.to_list()

    total = len(all_items)
    pages = max(1, math.ceil(total / page_size)) if total > 0 else 0
    start = (page - 1) * page_size
    page_items = all_items[start : start + page_size]

    return PromotionListResponse(
        items=[promotion_to_summary(p) for p in page_items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_promotion_detail(promotion_id: str, *, allow_inactive: bool) -> PromotionDetail:
    """Chi tiết mã KM."""

    promotion = await _get_promotion_or_404(promotion_id)
    if not allow_inactive and not promotion.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mã khuyến mãi")
    return promotion_to_detail(promotion)


async def create_promotion(data: PromotionCreate) -> PromotionDetail:
    """Tạo mã KM mới."""

    existing = await Promotion.find({"code": data.code}).first_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mã khuyến mãi đã tồn tại",
        )

    promotion = Promotion(
        code=data.code,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_value=data.min_order_value,
        max_discount_amount=data.max_discount_amount,
        start_date=data.start_date,
        end_date=data.end_date,
        usage_limit=data.usage_limit,
        is_active=data.is_active,
        used_count=0,
    )
    try:
        await promotion.insert()
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mã khuyến mãi đã tồn tại",
        ) from exc
    return promotion_to_detail(promotion)


async def update_promotion(promotion_id: str, data: PromotionUpdate) -> PromotionDetail:
    """Thay thế toàn bộ mã KM."""

    promotion = await _get_promotion_or_404(promotion_id)
    if data.code != promotion.code:
        dup = await Promotion.find({"code": data.code}).first_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mã khuyến mãi đã tồn tại",
            )

    promotion.code = data.code
    promotion.description = data.description
    promotion.discount_type = data.discount_type
    promotion.discount_value = data.discount_value
    promotion.min_order_value = data.min_order_value
    promotion.max_discount_amount = data.max_discount_amount
    promotion.start_date = data.start_date
    promotion.end_date = data.end_date
    promotion.usage_limit = data.usage_limit
    promotion.is_active = data.is_active
    _validate_promotion_state(promotion)
    await promotion.save()
    return promotion_to_detail(promotion)


async def patch_promotion(promotion_id: str, data: PromotionPatch) -> PromotionDetail:
    """Cập nhật một phần."""

    promotion = await _get_promotion_or_404(promotion_id)
    updates = data.model_dump(exclude_unset=True)

    new_code = updates.get("code")
    if new_code and new_code != promotion.code:
        dup = await Promotion.find({"code": new_code}).first_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mã khuyến mãi đã tồn tại",
            )

    for key, value in updates.items():
        setattr(promotion, key, value)

    _validate_promotion_state(promotion)
    await promotion.save()
    return promotion_to_detail(promotion)


async def deactivate_promotion(promotion_id: str) -> PromotionDetail:
    """Ẩn mã KM (soft delete)."""

    promotion = await _get_promotion_or_404(promotion_id)
    promotion.is_active = False
    await promotion.save()
    return promotion_to_detail(promotion)


async def resolve_promotion_for_order(*, code: str, subtotal: int) -> tuple[Promotion, int]:
    """
    Kiểm tra mã KM và tính discount — không tăng used_count.

    Dùng trước khi atomic increment lúc tạo đơn.
    """

    normalized = normalize_promotion_code(code)
    promotion = await Promotion.find({"code": normalized}).first_or_none()
    if promotion is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi không tồn tại",
        )
    now = utc_now()
    _ensure_promotion_usable(promotion, subtotal=subtotal, now=now)
    discount_amount = calculate_discount(subtotal, promotion)
    return promotion, discount_amount


async def increment_promotion_used_count(promotion_id: PydanticObjectId) -> None:
    """Tăng used_count nếu còn lượt — ném 400 nếu hết."""

    promotion = await Promotion.get(promotion_id)
    if promotion is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi không tồn tại",
        )

    query: dict[str, Any] = {"_id": promotion_id}
    if promotion.usage_limit is not None:
        query["used_count"] = {"$lt": promotion.usage_limit}

    collection = Promotion.get_pymongo_collection()
    result = await collection.find_one_and_update(query, {"$inc": {"used_count": 1}})
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi đã hết lượt sử dụng",
        )


async def decrement_promotion_used_count(promotion_id: PydanticObjectId) -> None:
    """Hoàn một lượt dùng mã (hủy đơn)."""

    collection = Promotion.get_pymongo_collection()
    await collection.update_one(
        {"_id": promotion_id, "used_count": {"$gt": 0}},
        {"$inc": {"used_count": -1}},
    )


async def validate_promotion_code(*, code: str, subtotal: int) -> PromotionValidateResponse:
    """
    Kiểm tra mã và tính giảm giá — không tăng used_count.

    Phase 4 (Orders) sẽ gọi lại khi tạo đơn.
    """

    promotion, discount_amount = await resolve_promotion_for_order(code=code, subtotal=subtotal)
    return PromotionValidateResponse(
        promotion_id=str(promotion.id),
        code=promotion.code,
        discount_type=promotion.discount_type,
        discount_value=promotion.discount_value,
        discount_amount=discount_amount,
        subtotal=subtotal,
        total_after_discount=subtotal - discount_amount,
        message="Áp dụng mã thành công",
    )


def _ensure_promotion_usable(promotion: Promotion, *, subtotal: int, now: datetime) -> None:
    """Ném 400 nếu mã không dùng được."""

    now = _as_utc(now)
    start = _as_utc(promotion.start_date)
    end = _as_utc(promotion.end_date)

    if not promotion.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi không còn hiệu lực",
        )
    if now < start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi chưa có hiệu lực",
        )
    if now > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi đã hết hạn",
        )
    if subtotal < promotion.min_order_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Đơn hàng tối thiểu {promotion.min_order_value} VND để dùng mã này",
        )
    if promotion.usage_limit is not None and promotion.used_count >= promotion.usage_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi đã hết lượt sử dụng",
        )


async def _get_promotion_or_404(promotion_id: str) -> Promotion:
    try:
        oid = PydanticObjectId(promotion_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy mã khuyến mãi",
        ) from exc

    promotion = await Promotion.get(oid)
    if promotion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mã khuyến mãi")
    return promotion
