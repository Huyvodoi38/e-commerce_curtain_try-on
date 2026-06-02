"""Router xác thực: local (username) + Google OAuth redirect."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.cookies import REFRESH_COOKIE_NAME, clear_refresh_cookie, set_refresh_cookie
from app.api.dependencies import get_current_active_user
from app.api.oauth_redirects import (
    auth_callback_success_redirect,
    http_exception_to_google_error,
    login_error_redirect,
    read_redirect_from_oauth_state,
)
from app.api.schemas.auth import TokenResponse, UserLogin, UserPublic, UserRegister
from app.core.config import settings
from app.core.oauth import oauth
from app.models.user import User
from app.services.auth_service import (
    authenticate_local_user,
    refresh_access_token,
    register_local_user,
    revoke_refresh_token,
    user_to_public,
)
from app.services.oauth_service import login_or_register_google
from app.utils.redirect_path import sanitize_redirect_path

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, response: Response) -> TokenResponse:
    """Đăng ký tài khoản username + mật khẩu."""

    user, access, refresh = await register_local_user(data)
    set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, user=user_to_public(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, response: Response) -> TokenResponse:
    """Đăng nhập bằng username + mật khẩu."""

    user, access, refresh = await authenticate_local_user(data)
    set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, user=user_to_public(user))


@router.get("/google/login")
async def google_login(
    request: Request,
    redirect: str | None = Query(default=None, description="Path FE sau khi đăng nhập"),
) -> RedirectResponse:
    """Chuyển hướng sang Google OAuth consent screen."""

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return login_error_redirect("google_config", redirect=redirect)

    safe_redirect = sanitize_redirect_path(redirect)
    oauth_state = safe_redirect if safe_redirect else None
    return await oauth.google.authorize_redirect(
        request,
        settings.google_redirect_uri,
        state=oauth_state,
    )


@router.get("/google/callback")
async def google_callback(request: Request) -> RedirectResponse:
    """
    Callback từ Google — tạo/đăng nhập user email,
    set refresh cookie, redirect về frontend.
    """

    post_login_redirect = read_redirect_from_oauth_state(request.query_params.get("state"))

    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return login_error_redirect("google", redirect=post_login_redirect)

    userinfo = token.get("userinfo")
    if not userinfo:
        return login_error_redirect("google", redirect=post_login_redirect)

    try:
        user, access, refresh = await login_or_register_google(
            provider_user_id=userinfo["sub"],
            email=userinfo.get("email", ""),
            full_name=userinfo.get("name", ""),
            email_verified=bool(userinfo.get("email_verified")),
        )
    except HTTPException as exc:
        code = http_exception_to_google_error(exc)
        return login_error_redirect(code, redirect=post_login_redirect)

    return auth_callback_success_redirect(
        access,
        refresh,
        redirect=post_login_redirect,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(request: Request, response: Response) -> TokenResponse:
    """Đổi refresh cookie lấy access token mới."""

    refresh_plain = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_plain:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )

    user, access, new_refresh = await refresh_access_token(refresh_plain)
    set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access, user=user_to_public(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response) -> Response:
    """Thu hồi refresh token và xóa cookie."""

    refresh_plain = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_plain:
        await revoke_refresh_token(refresh_plain)
    clear_refresh_cookie(response)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_active_user)) -> UserPublic:
    """Thông tin user từ access token."""

    return user_to_public(current_user)
