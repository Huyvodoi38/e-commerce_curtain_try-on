"""Schema request/response cho API AI try-on."""

from datetime import datetime

from pydantic import BaseModel, Field


class AiResolveInfo(BaseModel):
    """Kết quả kiểm tra attributes → prompt (admin)."""

    missing_slots: list[str] = Field(default_factory=list)
    unmapped: list[str] = Field(default_factory=list)


class TryOnBBox(BaseModel):
    x_min: int
    y_min: int
    x_max: int
    y_max: int


class TryOnPreviewResponse(BaseModel):
    result_image_base64: str
    product_id: str
    bbox: TryOnBBox


class TryOnSaveResponse(BaseModel):
    id: str
    product_id: str
    original_room_url: str
    result_url: str
    created_at: datetime


class TryOnHistoryItem(BaseModel):
    id: str
    product_id: str
    product_name: str | None = None
    original_room_url: str
    result_url: str | None
    created_at: datetime


class TryOnHistoryResponse(BaseModel):
    items: list[TryOnHistoryItem]
    total: int
    page: int
    page_size: int
    pages: int
