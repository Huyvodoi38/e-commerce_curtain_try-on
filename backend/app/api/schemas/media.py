"""Schema API upload media."""

from pydantic import BaseModel, Field


class MediaUploadResponse(BaseModel):
    url: str = Field(description="secure_url từ Cloudinary")
    public_id: str
    folder: str


class MediaDeleteRequest(BaseModel):
    url: str = Field(min_length=1, description="secure_url Cloudinary cần xóa")
