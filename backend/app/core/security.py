"""Hash mật khẩu và JWT access/refresh."""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Băm mật khẩu bcrypt."""

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """So khớp mật khẩu plain với hash."""

    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def hash_token(token: str) -> str:
    """Hash refresh token trước khi lưu DB."""

    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(*, user_id: str, role: str) -> str:
    """Tạo JWT access token."""

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(*, user_id: str) -> tuple[str, str, datetime]:
    """
    Tạo JWT refresh token.

    Returns:
        (token_plain, jti, expires_at)
    """

    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": jti,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expire


def decode_token(token: str) -> dict:
    """Giải mã JWT; raise JWTError nếu không hợp lệ."""

    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def generate_csrf_state() -> str:
    """State ngẫu nhiên chống CSRF cho OAuth redirect."""

    return secrets.token_urlsafe(32)
