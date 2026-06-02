"""Router quản trị user — staff/manager."""

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import require_staff
from app.api.schemas.activity_log import ActivityLogListResponse
from app.api.schemas.auth import UserPublic
from app.api.schemas.user import UserAdminPatch, UserCreate, UserListResponse
from app.services import audit_service
from app.models.enums import UserRole
from app.models.user import User
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    current_user: User = Depends(require_staff),
) -> UserListResponse:
    """Staff: danh sách khách. Manager: thêm nhân viên."""

    return await user_service.list_users(
        current_user=current_user,
        page=page,
        page_size=page_size,
        role_filter=role,
        is_active=is_active,
        search=search,
    )


@router.post("", response_model=UserPublic, status_code=201)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_staff),
) -> UserPublic:
    """Tạo khách (staff+) hoặc nhân viên (manager)."""

    return await user_service.create_user(current_user, data)


@router.get("/{user_id}/audit-logs", response_model=ActivityLogListResponse)
async def list_user_audit_logs(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_staff),
) -> ActivityLogListResponse:
    """Timeline hoạt động của một user."""

    return await audit_service.list_logs_for_user(
        user_id,
        current_user=current_user,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_staff),
) -> UserPublic:
    """Chi tiết user."""

    return await user_service.get_user_admin(user_id, current_user)


@router.patch("/{user_id}", response_model=UserPublic)
async def patch_user(
    user_id: str,
    data: UserAdminPatch,
    current_user: User = Depends(require_staff),
) -> UserPublic:
    """Cập nhật user — khóa cần reason."""

    return await user_service.patch_user_admin(user_id, current_user, data)
