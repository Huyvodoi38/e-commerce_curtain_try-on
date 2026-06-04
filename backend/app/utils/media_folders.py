"""Đường dẫn folder Cloudinary — prefix + thư mục con."""

from enum import StrEnum

from app.core.config import settings

# Thư mục con (không gồm prefix)
FOLDER_PRODUCTS = "products"
FOLDER_AI_ROOMS = "ai/rooms"
FOLDER_AI_RESULTS = "ai/results"
FOLDER_AI_TEXTURES = "ai/textures"

# Upload qua API admin (phase hiện tại)
ADMIN_UPLOAD_FOLDERS: frozenset[str] = frozenset({FOLDER_PRODUCTS})

# Dùng nội bộ khi triển khai AI try-on
AI_UPLOAD_FOLDERS: frozenset[str] = frozenset(
    {FOLDER_AI_ROOMS, FOLDER_AI_RESULTS, FOLDER_AI_TEXTURES}
)


class MediaFolder(StrEnum):
    """Folder Cloudinary — dùng khi gọi media_service từ code."""

    PRODUCTS = FOLDER_PRODUCTS
    AI_ROOMS = FOLDER_AI_ROOMS
    AI_RESULTS = FOLDER_AI_RESULTS
    AI_TEXTURES = FOLDER_AI_TEXTURES


def cloudinary_folder_path(relative: str) -> str:
    """Ví dụ: curtain/products hoặc curtain/ai/rooms."""

    prefix = settings.CLOUDINARY_FOLDER_PREFIX.strip().strip("/")
    rel = relative.strip().strip("/")
    if prefix and rel:
        return f"{prefix}/{rel}"
    return prefix or rel
