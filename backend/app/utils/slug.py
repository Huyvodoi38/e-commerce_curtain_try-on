"""Sinh slug từ tên hiển thị."""

from __future__ import annotations

import re
import unicodedata


def slug_from_name(name: str, *, max_length: int = 64) -> str:
    normalized = unicodedata.normalize("NFD", name.strip())
    without_marks = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    asciiish = without_marks.replace("đ", "d").replace("Đ", "d").lower()
    cleaned = re.sub(r"[^a-z0-9\s-]", "", asciiish)
    slug = re.sub(r"\s+", " ", cleaned).strip()
    if not slug:
        raise ValueError("Không tạo được slug từ tên danh mục")
    return slug[:max_length]
