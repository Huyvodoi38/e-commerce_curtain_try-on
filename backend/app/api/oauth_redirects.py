"""Redirect về frontend sau OAuth Google (thành công / lỗi)."""

from urllib.parse import urlencode

from fastapi import HTTPException
from fastapi.responses import RedirectResponse

from app.api.cookies import set_refresh_cookie
from app.core.config import settings
from app.utils.redirect_path import sanitize_redirect_path

_GOOGLE_ERROR_CODES = frozenset(
    {
        "google",
        "google_config",
        "google_unverified",
        "google_email_conflict",
        "google_disabled",
        "google_no_email",
    }
)


def _frontend_base() -> str:
    return settings.FRONTEND_URL.rstrip("/")


def login_error_redirect(
    error: str,
    *,
    redirect: str | None = None,
) -> RedirectResponse:
    """Chuyển về trang login với mã lỗi OAuth."""

    code = error if error in _GOOGLE_ERROR_CODES else "google"
    params: dict[str, str] = {"error": code}
    safe = sanitize_redirect_path(redirect)
    if safe:
        params["redirect"] = safe
    url = f"{_frontend_base()}/login?{urlencode(params)}"
    return RedirectResponse(url=url, status_code=302)


def auth_callback_success_redirect(
    access_token: str,
    refresh_token: str,
    *,
    redirect: str | None = None,
) -> RedirectResponse:
    """Set refresh cookie và redirect FE /auth/callback#access_token=…"""

    query: dict[str, str] = {}
    safe = sanitize_redirect_path(redirect)
    if safe:
        query["redirect"] = safe

    path = "/auth/callback"
    if query:
        path = f"{path}?{urlencode(query)}"

    fragment = urlencode({"access_token": access_token})
    url = f"{_frontend_base()}{path}#{fragment}"
    response = RedirectResponse(url=url, status_code=302)
    set_refresh_cookie(response, refresh_token)
    return response


def http_exception_to_google_error(exc: HTTPException) -> str:
    """Map HTTPException từ oauth_service sang mã lỗi FE."""

    detail = exc.detail if isinstance(exc.detail, str) else ""
    if exc.status_code == 403:
        return "google_disabled"
    if exc.status_code == 409:
        return "google_email_conflict"
    if "xác minh" in detail.lower() or "verified" in detail.lower():
        return "google_unverified"
    if "email" in detail.lower():
        return "google_no_email"
    return "google"


def read_redirect_from_oauth_state(state: str | None) -> str | None:
    """Đọc path redirect đã gửi qua OAuth state (Google callback query)."""

    if not state or not state.strip():
        return None
    return sanitize_redirect_path(state.strip())
