"""Router danh mục sản phẩm — catalog public + quản lý manager."""

from fastapi import APIRouter, Depends

from app.api.dependencies import require_manager, require_staff
from app.api.schemas.category import (
    CategoryCreate,
    CategoryDetail,
    CategoryListResponse,
    CategoryPatch,
    CategorySlugPatch,
    CategoryTreeNode,
    CategoryUpdate,
)
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


@router.get("/manage", response_model=CategoryListResponse)
async def list_categories_manage(
    include_inactive: bool = False,
    _: User = Depends(require_staff),
) -> CategoryListResponse:
    """Danh sách quản trị — staff chỉ active; manager có thể include_inactive."""

    return await category_service.list_categories_admin(include_inactive=include_inactive)


@router.get("/{slug}", response_model=CategoryDetail)
async def get_category(slug: str) -> CategoryDetail:
    """Chi tiết danh mục theo slug."""

    return await category_service.get_category_by_slug(slug)


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
