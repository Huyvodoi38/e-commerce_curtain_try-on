"""FastAPI dependencies — xác thực JWT và phân quyền."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.roles import is_manager, is_staff_or_above
from app.core.security import decode_token
from app.models.user import User
from app.services.auth_service import get_user_by_id

bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """Giải mã access token và trả về User."""

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await get_user_by_id(user_id)


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """User đang hoạt động."""

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )
    return current_user


async def require_customer(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Chỉ khách hàng — ví dụ đặt hàng, xem đơn của mình."""

    from app.core.roles import is_customer

    if not is_customer(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ dành cho khách hàng",
        )
    return current_user


async def require_staff(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Nhân viên hoặc quản lý — xử lý đơn, cập nhật stock."""

    if not is_staff_or_above(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ dành cho nhân viên hoặc quản lý",
        )
    return current_user


async def get_optional_active_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
) -> User | None:
    """User từ Bearer nếu có; None nếu guest hoặc token không hợp lệ."""

    if credentials is None:
        return None
    try:
        user = await get_current_user(credentials)
        if not user.is_active:
            return None
        return user
    except HTTPException:
        return None


async def require_manager(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Chỉ quản lý — CRUD sản phẩm, KM, quản lý user."""

    if not is_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ dành cho quản lý",
        )
    return current_user
