"""Upload và xóa ảnh trên Cloudinary."""

import io
import logging
from typing import Any

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.models.product import Product
from app.utils.cloudinary_urls import (
    is_cloudinary_delivery_url,
    is_managed_asset_public_id,
    public_id_from_url,
)
from app.utils.media_folders import cloudinary_folder_path
from app.utils.product_images import resolved_image_urls

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _configure_cloudinary() -> None:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def require_cloudinary() -> None:
    if not settings.cloudinary_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary chưa được cấu hình (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)",
        )


async def upload_image(file: UploadFile, *, folder: str) -> dict[str, Any]:
    """
    Upload một file ảnh vào folder Cloudinary.
    Trả về dict gồm secure_url, public_id, folder (đường dẫn đầy đủ trên Cloudinary).
    """

    require_cloudinary()
    _configure_cloudinary()

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File rỗng",
        )
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh không được lớn hơn 5MB",
        )

    target_folder = cloudinary_folder_path(folder)
    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(raw),
            folder=target_folder,
            resource_type="image",
            use_filename=True,
            unique_filename=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không upload được lên Cloudinary",
        ) from exc

    secure_url = result.get("secure_url") or result.get("url")
    public_id = result.get("public_id")
    if not secure_url or not public_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Phản hồi Cloudinary không hợp lệ",
        )

    return {
        "url": secure_url,
        "public_id": public_id,
        "folder": target_folder,
    }


def _product_image_urls(product: Product) -> list[str]:
    urls = resolved_image_urls(product.image_urls, product.display_image_url)
    if product.ai_texture_url:
        texture = product.ai_texture_url.strip()
        if texture and texture not in urls:
            urls.append(texture)
    return urls


def delete_image_by_public_id(public_id: str) -> bool:
    """
    Xóa một asset trên Cloudinary. Trả True nếu API báo đã xóa / không tồn tại.
    Không raise — dùng khi dọn dẹp sau xóa sản phẩm.
    """

    if not settings.cloudinary_enabled:
        return False
    if not is_managed_asset_public_id(public_id):
        logger.info("skip cloudinary destroy (outside project prefix): %s", public_id)
        return False

    _configure_cloudinary()
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception as exc:
        logger.warning("cloudinary destroy failed for %s: %s", public_id, exc)
        return False

    status_value = (result or {}).get("result")
    if status_value in ("ok", "not found"):
        return True
    logger.warning("cloudinary destroy unexpected result for %s: %s", public_id, result)
    return False


def delete_image_by_url(url: str, *, strict: bool = False) -> bool:
    """
    Xóa asset theo delivery URL.
    strict=True (API admin): raise nếu Cloudinary bật mà destroy thất bại.
    """

    cleaned = url.strip()
    if not cleaned:
        if strict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL không hợp lệ",
            )
        return False

    if not is_cloudinary_delivery_url(cleaned):
        if strict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ xóa được ảnh hosted trên Cloudinary của dự án",
            )
        return False

    public_id = public_id_from_url(cleaned)
    if not public_id:
        if strict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không đọc được public_id từ URL",
            )
        return False

    if not is_managed_asset_public_id(public_id):
        if strict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh không thuộc thư mục dự án (curtain/…)",
            )
        return False

    if not settings.cloudinary_enabled:
        if strict:
            require_cloudinary()
        return False

    ok = delete_image_by_public_id(public_id)
    if strict and not ok:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không xóa được ảnh trên Cloudinary",
        )
    return ok


def delete_images_by_urls(urls: list[str]) -> None:
    """Xóa danh sách URL (best-effort)."""

    if not settings.cloudinary_enabled:
        return

    seen_ids: set[str] = set()
    for url in urls:
        public_id = public_id_from_url(url.strip())
        if not public_id or public_id in seen_ids:
            continue
        seen_ids.add(public_id)
        delete_image_by_public_id(public_id)


def delete_removed_image_urls(previous: list[str], current: list[str]) -> None:
    """Xóa URL có trong previous nhưng không còn trong current (so khớp public_id)."""

    def identity(url: str) -> str:
        return public_id_from_url(url.strip()) or url.strip()

    current_idents = {identity(u) for u in current}
    to_delete: list[str] = []
    seen: set[str] = set()
    for url in previous:
        ident = identity(url)
        if ident in current_idents or ident in seen:
            continue
        seen.add(ident)
        to_delete.append(url)

    delete_images_by_urls(to_delete)


def delete_images_for_product(product: Product) -> None:
    """Xóa ảnh Cloudinary gắn với sản phẩm (best-effort, không chặn xóa DB)."""

    delete_images_by_urls(_product_image_urls(product))
