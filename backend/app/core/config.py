"""Cấu hình ứng dụng sử dụng pydantic-settings."""

from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Định nghĩa các biến môi trường cốt lõi cho backend."""

    MONGODB_URL: str
    PROJECT_NAME: str = "Quang Huy Shop"
    MONGODB_DB_NAME: str = "Curtain_AI_TryOn"
    BEANIE_ALLOW_INDEX_DROPPING: bool = True

    # JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # OAuth Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # Dev proxy: để trống → dùng FRONTEND_URL/auth/google/callback
    # Production 2 domain: https://api.example.com/auth/google/callback
    GOOGLE_REDIRECT_URI: str = ""
    BACKEND_URL: str = "http://127.0.0.1:8000"
    FRONTEND_URL: str = "http://127.0.0.1:5173"
    # Dev: True = thêm origin localhost/127.0.0.1:5173 (không dùng wildcard *)
    CORS_ALLOW_ALL: bool = True

    # Cookie refresh token
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Chuyển khoản offline (hiển thị khi offline_subtype=bank)
    BANK_NAME: str = ""
    BANK_ACCOUNT_NUMBER: str = ""
    BANK_ACCOUNT_HOLDER: str = ""
    BANK_TRANSFER_NOTE_PREFIX: str = "Thanh toan don hang"

    # VNPay (Phase 4.2) — sandbox mặc định; IPN cần URL public (ngrok)
    VNPAY_TMN_CODE: str = ""
    VNPAY_HASH_SECRET: str = ""
    VNPAY_PAY_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_EXPIRE_MINUTES: int = 15
    # URL IPN đầy đủ, vd. https://xxxx.ngrok-free.app/payments/vnpay/ipn
    VNPAY_IPN_URL: str = ""
    # Return URL template — {order_id} thay bằng id đơn
    VNPAY_RETURN_URL_TEMPLATE: str = "http://localhost:5173/orders/{order_id}/pay/return"

    # Cloudinary — ảnh sản phẩm & AI try-on
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_FOLDER_PREFIX: str = "curtain"

    # AI try-on — Colab + ngrok (tạm thời)
    AI_SERVICE_URL: str = ""
    AI_TRYON_TIMEOUT_SECONDS: int = 120

    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"))

    @property
    def ai_service_enabled(self) -> bool:
        return bool(self.AI_SERVICE_URL.strip())

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(
            self.CLOUDINARY_CLOUD_NAME.strip()
            and self.CLOUDINARY_API_KEY.strip()
            and self.CLOUDINARY_API_SECRET.strip()
        )

    @property
    def vnpay_enabled(self) -> bool:
        return bool(self.VNPAY_TMN_CODE.strip() and self.VNPAY_HASH_SECRET.strip())

    def vnpay_return_url(self, order_id: str) -> str:
        """Return URL sau thanh toán — ưu tiên template; không thì FRONTEND_URL."""

        template = self.VNPAY_RETURN_URL_TEMPLATE.strip()
        if template and "{order_id}" in template and "localhost" not in template:
            return template.format(order_id=order_id)
        return f"{self.FRONTEND_URL.rstrip('/')}/orders/{order_id}/pay/return"

    @property
    def google_redirect_uri(self) -> str:
        """URI callback đăng ký trên Google Cloud Console."""

        explicit = self.GOOGLE_REDIRECT_URI.strip()
        if explicit:
            return explicit
        return f"{self.FRONTEND_URL.rstrip('/')}/auth/google/callback"

    @staticmethod
    def _is_local_url(url: str) -> bool:
        host = (urlparse(url).hostname or "").lower()
        return host in {"localhost", "127.0.0.1"}

    @staticmethod
    def _host(url: str) -> str:
        return (urlparse(url).hostname or "").lower()

    @property
    def is_production_like(self) -> bool:
        return not (
            self._is_local_url(self.FRONTEND_URL) and self._is_local_url(self.BACKEND_URL)
        )

    def validate_runtime_safety(self) -> None:
        """Fail-fast các cấu hình dễ gây lỗi bảo mật ở production."""

        if not self.is_production_like:
            return

        if self.CORS_ALLOW_ALL:
            raise ValueError("CORS_ALLOW_ALL phải là false trên production")

        if not self.COOKIE_SECURE:
            raise ValueError("COOKIE_SECURE phải là true trên production")

        frontend_host = self._host(self.FRONTEND_URL)
        backend_host = self._host(self.BACKEND_URL)
        if frontend_host and backend_host and frontend_host != backend_host:
            if self.COOKIE_SAMESITE.lower() != "none":
                raise ValueError(
                    "COOKIE_SAMESITE phải là 'none' khi frontend và backend khác domain"
                )

        if self.GOOGLE_REDIRECT_URI.strip() and self._is_local_url(self.GOOGLE_REDIRECT_URI):
            raise ValueError("GOOGLE_REDIRECT_URI production không được dùng localhost")

        if self.VNPAY_IPN_URL.strip() and self._is_local_url(self.VNPAY_IPN_URL):
            raise ValueError("VNPAY_IPN_URL production phải là URL public")


settings = Settings()
