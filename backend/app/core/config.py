"""Cấu hình ứng dụng sử dụng pydantic-settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Định nghĩa các biến môi trường cốt lõi cho backend."""

    MONGODB_URL: str
    PROJECT_NAME: str = "Curtain AI TryOn"
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
    # Để trống = để VNPay tự hiển thị phương thức phù hợp merchant.
    VNPAY_BANK_CODE: str = ""
    VNPAY_EXPIRE_MINUTES: int = 15
    # URL IPN đầy đủ, vd. https://xxxx.ngrok-free.app/payments/vnpay/ipn
    VNPAY_IPN_URL: str = ""
    # Return URL template — {order_id} thay bằng id đơn
    VNPAY_RETURN_URL_TEMPLATE: str = "http://localhost:5173/orders/{order_id}/pay/return"

    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"))

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


settings = Settings()
