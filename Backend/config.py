"""Cấu hình ứng dụng đọc từ biến môi trường (.env)."""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Tập trung toàn bộ cấu hình runtime của backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Thông tin ứng dụng
    app_name: str = Field(default="AI Curtain Shop")
    app_env: str = Field(default="development")
    secret_key: str = Field(default="change-me-in-production")

    # MongoDB
    mongo_uri: str = Field(default="mongodb://localhost:27017")
    mongo_db_name: str = Field(default="curtain_shop")

    # CORS: chuỗi các origin cách nhau bởi dấu phẩy
    cors_origins: str = Field(default="http://localhost:3000")

    # AI Engine
    # ai_enabled = false: tắt hoàn toàn endpoint /ai/tryon, không cần cài torch/diffusers.
    ai_enabled: bool = Field(default=False)
    load_ai_on_startup: bool = Field(default=False)
    sam_checkpoint: str = Field(default="models/sam_vit_b_01ec64.pth")
    sam_model_type: str = Field(default="vit_b")
    sd_model_id: str = Field(default="Uminosachi/realisticVisionV51_v51VAE-inpainting")
    controlnet_model_id: str = Field(default="lllyasviel/control_v11f1p_sd15_depth")
    depth_model_id: str = Field(default="Intel/dpt-large")

    @property
    def cors_origin_list(self) -> List[str]:
        """Trả về danh sách origin đã được tách và làm sạch."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cache cấu hình để tránh đọc lại file .env nhiều lần."""
    return Settings()
