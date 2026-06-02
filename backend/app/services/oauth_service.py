"""Nghiệp vụ đăng nhập Google OAuth (redirect flow)."""

from fastapi import HTTPException, status

from app.models.enums import ActivityAction, AuthProvider, OAuthProvider, UserRole
from app.services import audit_service
from app.models.oauth_account import UserOAuthAccount
from app.models.user import User
from app.services.auth_service import issue_token_pair


async def login_or_register_google(
    *,
    provider_user_id: str,
    email: str,
    full_name: str,
    email_verified: bool,
) -> tuple[User, str, str]:
    """
    Xử lý sau khi Google trả về thông tin user.

    - Đã có OAuth account → đăng nhập.
    - Chưa có → tạo User (email) + UserOAuthAccount.
    - Không gộp với tài khoản local (username) — email chỉ dành cho Google.

    Returns:
        (user, access_token, refresh_token_plain)
    """

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google không cung cấp email",
        )

    if not email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email Google chưa được xác minh",
        )

    oauth_account = await UserOAuthAccount.find(
        {
            "provider": OAuthProvider.GOOGLE.value,
            "provider_user_id": provider_user_id,
        }
    ).first_or_none()

    if oauth_account:
        user = await User.get(oauth_account.user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa",
            )
        access, refresh = await issue_token_pair(user)
        return user, access, refresh

    # Tài khoản Google mới — email chưa được dùng bởi user Google khác
    email_owner = await User.find({"email": email.lower()}).first_or_none()
    if email_owner is not None:
        if email_owner.auth_provider == AuthProvider.LOCAL:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email này không khả dụng cho đăng nhập Google",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được đăng ký bằng Google",
        )

    # Google đăng ký mặc định là khách hàng
    user = User(
        username=None,
        email=email.lower(),
        hashed_password=None,
        full_name=full_name or email.split("@")[0],
        auth_provider=AuthProvider.GOOGLE,
        email_verified=email_verified,
        role=UserRole.CUSTOMER,
    )
    await user.insert()
    await audit_service.log_activity(
        actor=user,
        action=ActivityAction.USER_REGISTERED_GOOGLE,
        customer_id=user.id,
        metadata={"email": user.email, "auth_provider": AuthProvider.GOOGLE.value},
    )

    await UserOAuthAccount(
        user_id=user.id,
        provider=OAuthProvider.GOOGLE,
        provider_user_id=provider_user_id,
        email=email.lower(),
    ).insert()

    access, refresh = await issue_token_pair(user)
    return user, access, refresh
