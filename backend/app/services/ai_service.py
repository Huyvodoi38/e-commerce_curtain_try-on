"""Nghiệp vụ AI try-on — preview, lưu lịch sử, gọi Colab qua ngrok."""

from __future__ import annotations

import base64
import logging
import math
from typing import Any

import httpx
from beanie import PydanticObjectId
from fastapi import HTTPException, UploadFile, status

from app.ai.config import AI_INFERENCE, AI_INFERENCE_VERSION
from app.ai.prompt_resolver import resolve_ai_prompt
from app.api.schemas.ai import (
    TryOnBBox,
    TryOnHistoryItem,
    TryOnHistoryResponse,
    TryOnPreviewResponse,
    TryOnSaveResponse,
)
from app.core.config import settings
from app.models.common import utc_now
from app.models.enums import AIStatus
from app.models.history import TryOnHistory
from app.models.product import Product
from app.models.user import User
from app.services import media_service
from app.utils.media_folders import MediaFolder

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})


def _require_ai_service() -> str:
    url = settings.AI_SERVICE_URL.strip().rstrip("/")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ AI chưa được cấu hình (AI_SERVICE_URL)",
        )
    return url


async def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP",
        )
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File rỗng")
    if len(raw) > media_service.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh không được lớn hơn 5MB",
        )
    return raw, content_type


def _normalize_bbox(
    x_min: int,
    y_min: int,
    x_max: int,
    y_max: int,
) -> TryOnBBox | None:
    if x_max <= x_min or y_max <= y_min:
        return None
    return TryOnBBox(x_min=x_min, y_min=y_min, x_max=x_max, y_max=y_max)


async def _get_product_for_tryon(product_id: str) -> tuple[Product, Any]:
    try:
        oid = PydanticObjectId(product_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm",
        ) from exc

    product = await Product.get(oid)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")

    resolved = resolve_ai_prompt(product.attributes)
    if not resolved.available or not resolved.prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sản phẩm chưa đủ thuộc tính để thử rèm AI",
        )
    return product, resolved


async def _call_ai_service(
    *,
    image_bytes: bytes,
    content_type: str,
    filename: str,
    prompt: str,
    neg_prompt: str,
    bbox: TryOnBBox | None,
) -> bytes:
    base_url = _require_ai_service()
    form_data: dict[str, str] = {
        "prompt": prompt,
        "neg_prompt": neg_prompt,
        "expansion": str(AI_INFERENCE["expansion"]),
        "control_scale": str(AI_INFERENCE["control_scale"]),
        "process_res": str(AI_INFERENCE["process_res"]),
    }
    if bbox is not None:
        form_data.update(
            {
                "x_min": str(bbox.x_min),
                "y_min": str(bbox.y_min),
                "x_max": str(bbox.x_max),
                "y_max": str(bbox.y_max),
            }
        )

    headers = {"ngrok-skip-browser-warning": "true"}
    if settings.AI_SERVICE_TOKEN.strip():
        headers["X-AI-Token"] = settings.AI_SERVICE_TOKEN.strip()
    timeout = httpx.Timeout(settings.AI_TRYON_TIMEOUT_SECONDS, connect=30.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{base_url}/tryon",
                files={"image": (filename, image_bytes, content_type)},
                data=form_data,
                headers=headers,
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI xử lý quá lâu — thử lại hoặc kiểm tra Colab/ngrok",
        ) from exc
    except httpx.RequestError as exc:
        logger.warning("ai service request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không kết nối được dịch vụ AI — kiểm tra Colab và AI_SERVICE_URL",
        ) from exc

    if response.status_code >= 400:
        detail = "Dịch vụ AI trả lỗi"
        try:
            payload = response.json()
            if isinstance(payload, dict) and payload.get("error"):
                detail = str(payload["error"])
            elif isinstance(payload, dict) and payload.get("detail"):
                detail = str(payload["detail"])
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    if not response.content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dịch vụ AI không trả ảnh kết quả",
        )
    return response.content


async def preview_try_on(
    *,
    product_id: str,
    room_image: UploadFile,
    x_min: int,
    y_min: int,
    x_max: int,
    y_max: int,
) -> TryOnPreviewResponse:
    product, resolved = await _get_product_for_tryon(product_id)
    image_bytes, content_type = await _read_upload(room_image)
    bbox = _normalize_bbox(x_min, y_min, x_max, y_max)
    if bbox is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng vẽ khung quanh cửa sổ trên ảnh",
        )

    filename = room_image.filename or "room.jpg"
    result_bytes = await _call_ai_service(
        image_bytes=image_bytes,
        content_type=content_type,
        filename=filename,
        prompt=resolved.prompt or "",
        neg_prompt=resolved.negative_prompt,
        bbox=bbox,
    )

    encoded = base64.b64encode(result_bytes).decode("ascii")
    return TryOnPreviewResponse(
        result_image_base64=encoded,
        product_id=str(product.id),
        bbox=bbox,
    )


async def save_try_on(
    *,
    user: User,
    product_id: str,
    room_image: UploadFile,
    result_image: UploadFile,
    x_min: int,
    y_min: int,
    x_max: int,
    y_max: int,
) -> TryOnSaveResponse:
    product, resolved = await _get_product_for_tryon(product_id)
    bbox = _normalize_bbox(x_min, y_min, x_max, y_max)
    if bbox is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng vẽ khung quanh cửa sổ trên ảnh",
        )

    room_bytes, room_type = await _read_upload(room_image)
    result_bytes, result_type = await _read_upload(result_image)

    room_upload = await media_service.upload_image_bytes(
        room_bytes,
        folder=MediaFolder.AI_ROOMS,
        content_type=room_type,
        filename=room_image.filename or "room.jpg",
    )
    result_upload = await media_service.upload_image_bytes(
        result_bytes,
        folder=MediaFolder.AI_RESULTS,
        content_type=result_type,
        filename=result_image.filename or "result.png",
    )

    history = TryOnHistory(
        user_id=user.id,
        product_id=product.id,
        original_room_url=room_upload["url"],
        result_url=result_upload["url"],
        ai_status=AIStatus.COMPLETED,
        metadata={
            "bbox": bbox.model_dump(),
            "prompt": resolved.prompt,
            "inference_version": AI_INFERENCE_VERSION,
            "inference_params": dict(AI_INFERENCE),
        },
    )
    await history.insert()

    return TryOnSaveResponse(
        id=str(history.id),
        product_id=str(product.id),
        original_room_url=history.original_room_url,
        result_url=history.result_url or "",
        created_at=history.created_at,
    )


async def list_try_on_history(
    *,
    user: User,
    page: int,
    page_size: int,
) -> TryOnHistoryResponse:
    query = {"user_id": user.id}
    total = await TryOnHistory.find(query).count()
    pages = max(1, math.ceil(total / page_size)) if total > 0 else 0
    skip = (page - 1) * page_size
    rows = (
        await TryOnHistory.find(query)
        .sort([("created_at", -1)])
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    product_ids = list({row.product_id for row in rows})
    products = await Product.find({"_id": {"$in": product_ids}}).to_list() if product_ids else []
    name_by_id = {p.id: p.name for p in products}

    items = [
        TryOnHistoryItem(
            id=str(row.id),
            product_id=str(row.product_id),
            product_name=name_by_id.get(row.product_id),
            original_room_url=row.original_room_url,
            result_url=row.result_url,
            created_at=row.created_at,
        )
        for row in rows
    ]

    return TryOnHistoryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )
