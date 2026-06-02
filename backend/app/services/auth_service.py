"""Nghiệp vụ đăng ký / đăng nhập local và quản lý refresh token."""

from beanie import PydanticObjectId
from fastapi import HTTPException, status
from jose import JWTError

from app.api.schemas.auth import UserLogin, UserPublic, UserRegister
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.enums import ActivityAction, AuthProvider, UserRole
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services import audit_service


def user_to_public(user: User) -> UserPublic:
    """Chuyển Beanie User sang schema public."""

    return UserPublic(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        auth_provider=user.auth_provider,
        email_verified=user.email_verified,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


async def register_local_user(data: UserRegister) -> tuple[User, str, str]:
    """
    Đăng ký tài khoản username + mật khẩu.

    Returns:
        (user, access_token, refresh_token_plain)
    """

    existing = await User.find({"username": data.username}).first_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username đã được sử dụng",
        )

    # Đăng ký public chỉ tạo khách hàng — staff/manager do quản lý tạo (phase Users)
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        auth_provider=AuthProvider.LOCAL,
        email_verified=False,
        role=UserRole.CUSTOMER,
    )
    await user.insert()
    await audit_service.log_activity(
        actor=user,
        action=ActivityAction.USER_REGISTERED,
        customer_id=user.id,
        metadata={"username": user.username, "auth_provider": AuthProvider.LOCAL.value},
    )
    access, refresh = await issue_token_pair(user)
    return user, access, refresh


async def authenticate_local_user(data: UserLogin) -> tuple[User, str, str]:
    """Đăng nhập bằng username + mật khẩu."""

    user = await User.find({"username": data.username}).first_or_none()
    if (
        user is None
        or user.auth_provider != AuthProvider.LOCAL
        or user.hashed_password is None
        or not verify_password(data.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username hoặc mật khẩu không đúng",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )
    access, refresh = await issue_token_pair(user)
    return user, access, refresh


async def issue_token_pair(user: User) -> tuple[str, str]:
    """Tạo access + refresh và lưu refresh vào DB."""

    access = create_access_token(user_id=str(user.id), role=user.role.value)
    refresh_plain, jti, expires_at = create_refresh_token(user_id=str(user.id))
    await RefreshToken(
        user_id=user.id,
        jti=jti,
        token_hash=hash_token(refresh_plain),
        expires_at=expires_at,
    ).insert()
    return access, refresh_plain


async def refresh_access_token(refresh_plain: str) -> tuple[User, str, str]:
    """
    Đổi refresh lấy access mới (rotate refresh).

    Returns:
        (user, new_access, new_refresh_plain)
    """

    try:
        payload = decode_token(refresh_plain)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        ) from None

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )

    jti = payload.get("jti")
    user_id = payload.get("sub")
    if not jti or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )

    stored = await RefreshToken.find({"jti": jti}).first_or_none()
    if (
        stored is None
        or stored.revoked
        or stored.token_hash != hash_token(refresh_plain)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )

    user = await User.get(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )

    stored.revoked = True
    await stored.save()

    access, new_refresh = await issue_token_pair(user)
    return user, access, new_refresh


async def revoke_refresh_token(refresh_plain: str) -> None:
    """Thu hồi refresh token khi logout."""

    try:
        payload = decode_token(refresh_plain)
    except JWTError:
        return

    jti = payload.get("jti")
    if not jti:
        return

    stored = await RefreshToken.find({"jti": jti}).first_or_none()
    if stored and not stored.revoked:
        stored.revoked = True
        await stored.save()


async def revoke_all_refresh_tokens(user_id: PydanticObjectId) -> None:
    """Thu hồi mọi refresh token khi khóa tài khoản."""

    collection = RefreshToken.get_pymongo_collection()
    await collection.update_many(
        {"user_id": user_id, "revoked": False},
        {"$set": {"revoked": True}},
    )


async def get_user_by_id(user_id: str) -> User:
    """Lấy user theo id hoặc 401."""

    user = await User.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )
    return user
