"""API AI try-on — preview (không lưu) và save (Cloudinary + lịch sử)."""

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from app.api.dependencies import require_customer
from app.api.schemas.ai import TryOnHistoryResponse, TryOnPreviewResponse, TryOnSaveResponse
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])

# Tác vụ AI rất nặng (GPU) → giới hạn chặt theo IP để tránh lạm dụng.
_ai_rate_limit = rate_limit(limit=6, window_seconds=60, scope="ai")


@router.post(
    "/try-on/preview",
    response_model=TryOnPreviewResponse,
    dependencies=[Depends(_ai_rate_limit)],
)
async def try_on_preview(
    product_id: str = Form(...),
    room_image: UploadFile = File(...),
    x_min: int = Form(...),
    y_min: int = Form(...),
    x_max: int = Form(...),
    y_max: int = Form(...),
    current_user: User = Depends(require_customer),
) -> TryOnPreviewResponse:
    """
    Tạo preview try-on — không upload Cloudinary, không ghi lịch sử.
    Yêu cầu đăng nhập khách hàng. Cần Colab + ngrok (AI_SERVICE_URL).
    """

    return await ai_service.preview_try_on(
        product_id=product_id,
        room_image=room_image,
        x_min=x_min,
        y_min=y_min,
        x_max=x_max,
        y_max=y_max,
    )


@router.post(
    "/try-on/save",
    response_model=TryOnSaveResponse,
    status_code=201,
    dependencies=[Depends(_ai_rate_limit)],
)
async def try_on_save(
    product_id: str = Form(...),
    room_image: UploadFile = File(...),
    result_image: UploadFile = File(...),
    x_min: int = Form(...),
    y_min: int = Form(...),
    x_max: int = Form(...),
    y_max: int = Form(...),
    current_user: User = Depends(require_customer),
) -> TryOnSaveResponse:
    """Lưu kết quả try-on sau khi người dùng xác nhận."""

    return await ai_service.save_try_on(
        user=current_user,
        product_id=product_id,
        room_image=room_image,
        result_image=result_image,
        x_min=x_min,
        y_min=y_min,
        x_max=x_max,
        y_max=y_max,
    )


@router.get("/history", response_model=TryOnHistoryResponse)
async def try_on_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_customer),
) -> TryOnHistoryResponse:
    """Lịch sử try-on của khách hàng."""

    return await ai_service.list_try_on_history(
        user=current_user,
        page=page,
        page_size=page_size,
    )
