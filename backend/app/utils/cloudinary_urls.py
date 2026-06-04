"""Parse public_id từ URL delivery Cloudinary."""

import re
from urllib.parse import urlparse

from app.core.config import settings

_CLOUDINARY_HOST = "res.cloudinary.com"
_VERSION_RE = re.compile(r"^v\d+$")
_IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg")


def is_cloudinary_delivery_url(url: str) -> bool:
    if not url or _CLOUDINARY_HOST not in url:
        return False
    cloud = settings.CLOUDINARY_CLOUD_NAME.strip()
    return bool(cloud and f"/{cloud}/" in url)


def _strip_extension(path: str) -> str:
    lower = path.lower()
    for ext in _IMAGE_EXT:
        if lower.endswith(ext):
            return path[: -len(ext)]
    return path


def _looks_like_transform_segment(segment: str) -> bool:
    if _VERSION_RE.fullmatch(segment):
        return True
    if "," in segment:
        return True
    if "." in segment:
        return False
    return "_" in segment


def public_id_from_url(url: str) -> str | None:
    """
    Lấy public_id (không có đuôi file) từ secure_url Cloudinary.
    Trả None nếu không phải URL Cloudinary của cloud hiện tại.
    """

    if not is_cloudinary_delivery_url(url):
        return None

    path = urlparse(url.split("?")[0]).path
    upload_idx = path.find("/upload/")
    if upload_idx < 0:
        return None

    suffix = path[upload_idx + len("/upload/") :].lstrip("/")
    if not suffix:
        return None

    segments = suffix.split("/")
    while segments and _looks_like_transform_segment(segments[0]):
        if _VERSION_RE.fullmatch(segments[0]):
            segments = segments[1:]
            continue
        if "," in segments[0] or ("_" in segments[0] and "." not in segments[0]):
            segments = segments[1:]
            continue
        break

    if not segments:
        return None

    return _strip_extension("/".join(segments))


def is_managed_asset_public_id(public_id: str) -> bool:
    """Chỉ xóa asset thuộc prefix dự án (tránh URL Cloudinary lạ gắn thủ công)."""

    prefix = settings.CLOUDINARY_FOLDER_PREFIX.strip().strip("/")
    if not prefix:
        return True
    return public_id == prefix or public_id.startswith(f"{prefix}/")
