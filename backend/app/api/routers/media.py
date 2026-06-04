"""Upload ảnh — Cloudinary (admin sản phẩm)."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.dependencies import require_manager
from app.api.schemas.media import MediaDeleteRequest, MediaUploadResponse
from app.models.user import User
from app.services import media_service
from app.utils.media_folders import ADMIN_UPLOAD_FOLDERS

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    folder: str = Query(
        "products",
        description="Thư mục con: products (admin). AI: ai/rooms, ai/results, ai/textures — dùng nội bộ sau.",
    ),
    _: User = Depends(require_manager),
) -> MediaUploadResponse:
    """Upload ảnh sản phẩm (manager). Cần cấu hình Cloudinary trên server."""

    if folder not in ADMIN_UPLOAD_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"folder không hỗ trợ qua API: {folder}. Cho phép: {', '.join(sorted(ADMIN_UPLOAD_FOLDERS))}",
        )

    result = await media_service.upload_image(file, folder=folder)
    return MediaUploadResponse(**result)


@router.delete("/asset", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media_asset(
    payload: MediaDeleteRequest,
    _: User = Depends(require_manager),
) -> None:
    """Xóa ảnh trên Cloudinary khi admin gỡ khỏi form (URL thuộc cloud dự án)."""

    media_service.delete_image_by_url(payload.url, strict=True)
