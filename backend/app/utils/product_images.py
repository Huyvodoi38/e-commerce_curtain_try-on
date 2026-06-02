"""Chuẩn hóa danh sách ảnh sản phẩm — ảnh đầu tiên là ảnh chính."""


def normalize_image_urls(
    image_urls: list[str] | None,
    display_image_url: str | None = None,
) -> tuple[list[str], str | None]:
    """
    Gộp image_urls + display_image_url (legacy) thành list duy nhất.
    Trả về (image_urls, display_image_url) với display = phần tử đầu.
    """

    urls: list[str] = []
    seen: set[str] = set()
    for raw in image_urls or []:
        u = raw.strip()
        if u and u not in seen:
            seen.add(u)
            urls.append(u)
    if not urls and display_image_url:
        u = display_image_url.strip()
        if u:
            urls = [u]
    primary = urls[0] if urls else None
    return urls, primary


def resolved_image_urls(
    image_urls: list[str] | None,
    display_image_url: str | None = None,
) -> list[str]:
    """Đọc ảnh từ document (ưu tiên image_urls, fallback display_image_url cũ)."""

    urls, _ = normalize_image_urls(image_urls, display_image_url)
    return urls
