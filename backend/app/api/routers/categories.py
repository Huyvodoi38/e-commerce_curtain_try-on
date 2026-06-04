"""Router danh mục sản phẩm — catalog public + quản lý manager."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_optional_active_user, require_manager, require_staff
from app.api.schemas.category import (
    CategoryCreate,
    CategoryDetail,
    CategoryListResponse,
    CategoryManageListResponse,
    CategoryPatch,
    CategorySlugPatch,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.core.roles import is_manager, is_staff_or_above
from app.models.user import User
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    featured_only: bool = False,
) -> CategoryListResponse:
    """Danh sách danh mục đang bán — guest/customer/staff."""

    return await category_service.list_categories_public(featured_only=featured_only)


@router.get("/tree", response_model=list[CategoryTreeNode])
async def list_categories_tree() -> list[CategoryTreeNode]:
    """Cây danh mục active — menu header FE."""

    return await category_service.list_categories_tree_public()


@router.get("/manage", response_model=CategoryManageListResponse)
async def list_categories_manage(
    include_inactive: bool = False,
    current_user: User = Depends(require_staff),
) -> CategoryManageListResponse:
    """Danh sách quản trị — staff chỉ active; manager có thể include_inactive."""

    if include_inactive and not is_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="include_inactive chỉ dành cho quản lý",
        )

    return await category_service.list_categories_admin(
        include_inactive=include_inactive and is_manager(current_user),
    )


@router.get("/{slug}", response_model=CategoryDetail)
async def get_category(
    slug: str,
    current_user: User | None = Depends(get_optional_active_user),
) -> CategoryDetail:
    """Chi tiết danh mục theo slug — staff/manager xem được danh mục đã ẩn."""

    staff_view = current_user is not None and is_staff_or_above(current_user)
    return await category_service.get_category_by_slug(slug, admin=staff_view)


@router.post("", response_model=CategoryDetail, status_code=201)
async def create_category(
    data: CategoryCreate,
    _: User = Depends(require_manager),
) -> CategoryDetail:
    return await category_service.create_category(data)


@router.put("/{category_id}", response_model=CategoryDetail)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    _: User = Depends(require_manager),
) -> CategoryDetail:
    return await category_service.update_category(category_id, data)


@router.patch("/{category_id}", response_model=CategoryDetail)
async def patch_category(
    category_id: str,
    data: CategoryPatch,
    _: User = Depends(require_manager),
) -> CategoryDetail:
    return await category_service.patch_category(category_id, data)


@router.patch("/{category_id}/slug", response_model=CategoryDetail)
async def patch_category_slug(
    category_id: str,
    data: CategorySlugPatch,
    _: User = Depends(require_manager),
) -> CategoryDetail:
    return await category_service.patch_category_slug(category_id, data)


@router.delete("/{category_id}", response_model=CategoryDetail)
async def deactivate_category(
    category_id: str,
    _: User = Depends(require_manager),
) -> CategoryDetail:
    """Ẩn danh mục — từ chối nếu còn sản phẩm gắn slug."""

    return await category_service.deactivate_category(category_id)
