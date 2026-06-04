"""Nghiệp vụ danh mục sản phẩm."""

from __future__ import annotations

from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.api.schemas.category import (
    CategoryCreate,
    CategoryDetail,
    CategoryListResponse,
    CategoryManageItem,
    CategoryManageListResponse,
    CategoryPatch,
    CategoryPublic,
    CategorySlugPatch,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.models.category import Category
from app.models.common import utc_now
from app.models.product import Product
from app.utils.slug import slug_from_name

FEATURED_MENU_LIMIT = 8


async def list_categories_public(*, featured_only: bool = False) -> CategoryListResponse:
    """Guest/customer — chỉ category active."""

    query: dict[str, Any] = {"is_active": True}
    if featured_only:
        query["is_featured"] = True

    docs = await Category.find(query).sort([("name", 1)]).to_list()
    items = [_to_public(c) for c in docs]
    return CategoryListResponse(items=items, total=len(items))


async def list_categories_tree_public() -> list[CategoryTreeNode]:
    """Cây danh mục active — cho menu dropdown."""

    response = await list_categories_public()
    return _build_tree(response.items)


async def list_categories_admin(
    *,
    include_inactive: bool = False,
) -> CategoryManageListResponse:
    """Staff/manager — xem tất cả (kể cả ẩn khi include_inactive)."""

    query: dict[str, Any] = {}
    if not include_inactive:
        query["is_active"] = True

    docs = await Category.find(query).sort([("name", 1)]).to_list()
    items: list[CategoryManageItem] = []
    for category in docs:
        count = await count_products_by_slug(category.slug)
        items.append(
            CategoryManageItem(
                **_to_public(category).model_dump(),
                is_active=category.is_active,
                product_count=count,
            )
        )
    return CategoryManageListResponse(items=items, total=len(items))


async def get_category_by_slug(slug: str, *, admin: bool = False) -> CategoryDetail:
    """Chi tiết theo slug."""

    category = await _get_by_slug_or_404(slug)
    if not admin and not category.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy danh mục")
    return await _to_detail(category)


async def create_category(data: CategoryCreate) -> CategoryDetail:
    """Tạo danh mục — manager."""

    slug = await _unique_slug_from_name(data.name)
    parent_oid = await _resolve_parent_id(data.parent_id)
    if data.is_featured and data.is_active:
        await _ensure_featured_capacity(exclude_id=None)
    now = utc_now()
    category = Category(
        slug=slug,
        name=data.name,
        description=data.description,
        parent_id=parent_oid,
        sort_order=data.sort_order,
        is_featured=data.is_featured,
        is_active=data.is_active,
        image_url=data.image_url,
        created_at=now,
        updated_at=now,
    )
    await category.insert()
    return await _to_detail(category)


async def update_category(category_id: str, data: CategoryUpdate) -> CategoryDetail:
    """Thay thế metadata — slug tự đồng bộ theo tên."""

    category = await _get_or_404(category_id)
    if data.is_featured and data.is_active and not (category.is_featured and category.is_active):
        await _ensure_featured_capacity(exclude_id=category.id)
    category.name = data.name
    category.description = data.description
    category.parent_id = await _resolve_parent_id(data.parent_id, exclude_id=category.id)
    category.sort_order = data.sort_order
    category.is_featured = data.is_featured
    category.is_active = data.is_active
    category.image_url = data.image_url
    category.updated_at = utc_now()
    await _validate_no_parent_cycle(category)
    await _sync_slug_from_name(category)
    await category.save()
    return await _to_detail(category)


async def patch_category(category_id: str, data: CategoryPatch) -> CategoryDetail:
    """Cập nhật một phần."""

    category = await _get_or_404(category_id)
    updates = data.model_dump(exclude_unset=True)
    if "parent_id" in updates:
        updates["parent_id"] = await _resolve_parent_id(updates["parent_id"], exclude_id=category.id)
    will_active = updates.get("is_active", category.is_active)
    will_featured = updates.get("is_featured", category.is_featured)
    was_on_menu = category.is_active and category.is_featured
    will_on_menu = will_active and will_featured
    if will_on_menu and not was_on_menu:
        await _ensure_featured_capacity(exclude_id=category.id)
    for key, value in updates.items():
        setattr(category, key, value)
    category.updated_at = utc_now()
    await _validate_no_parent_cycle(category)
    if "name" in updates:
        await _sync_slug_from_name(category)
    await category.save()
    return await _to_detail(category)


async def patch_category_slug(category_id: str, data: CategorySlugPatch) -> CategoryDetail:
    """Đổi slug và đồng bộ Product.categories — dùng nội bộ / migration."""

    category = await _get_or_404(category_id)
    await _set_category_slug(category, data.slug)
    category.updated_at = utc_now()
    await category.save()
    return await _to_detail(category)


async def deactivate_category(category_id: str) -> CategoryDetail:
    """Ẩn danh mục — không xóa cứng nếu còn SP."""

    category = await _get_or_404(category_id)
    count = await count_products_by_slug(category.slug)
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể ẩn danh mục đang gắn {count} sản phẩm",
        )
    category.is_active = False
    category.updated_at = utc_now()
    await category.save()
    return await _to_detail(category)


async def validate_category_slugs(slugs: list[str]) -> list[str]:
    """
    Kiểm tra slug tồn tại và đang active.
    Trả về danh sách slug đã chuẩn hóa (unique, giữ thứ tự).
    """

    if not slugs:
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for raw in slugs:
        slug = raw.strip().lower()
        if not slug or slug in seen:
            continue
        seen.add(slug)
        normalized.append(slug)

    for slug in normalized:
        cat = await Category.find_one(Category.slug == slug)
        if cat is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Danh mục không tồn tại: {slug}",
            )
        if not cat.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Danh mục không còn hoạt động: {slug}",
            )

    return normalized


async def count_products_by_slug(slug: str) -> int:
    return await Product.find({"categories": slug}).count()


async def _unique_slug_from_name(
    name: str,
    *,
    exclude_id: PydanticObjectId | None = None,
) -> str:
    base = slug_from_name(name)
    candidate = base
    suffix = 2
    while True:
        existing = await Category.find_one(Category.slug == candidate)
        if existing is None or (exclude_id is not None and existing.id == exclude_id):
            return candidate
        extra = f" {suffix}"
        candidate = f"{base[: max(1, 64 - len(extra))]}{extra}"
        suffix += 1


async def _set_category_slug(category: Category, new_slug: str) -> None:
    new_slug = new_slug.strip().lower()
    if new_slug == category.slug:
        return

    taken = await Category.find_one(Category.slug == new_slug)
    if taken is not None and taken.id != category.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Danh mục trùng tên")

    old_slug = category.slug
    category.slug = new_slug
    if old_slug == new_slug:
        return

    products = await Product.find({"categories": old_slug}).to_list()
    for product in products:
        product.categories = [new_slug if s == old_slug else s for s in product.categories]
        await product.save()


async def _sync_slug_from_name(category: Category) -> None:
    new_slug = await _unique_slug_from_name(category.name, exclude_id=category.id)
    await _set_category_slug(category, new_slug)


async def _ensure_featured_capacity(*, exclude_id: PydanticObjectId | None) -> None:
    """Giới hạn danh mục active + is_featured trên menu cửa hàng."""

    query: list[Any] = [Category.is_active == True, Category.is_featured == True]
    if exclude_id is not None:
        query.append(Category.id != exclude_id)
    count = await Category.find(*query).count()
    if count >= FEATURED_MENU_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ được chọn tối đa {FEATURED_MENU_LIMIT} danh mục nổi bật đang hiển thị",
        )


def _to_public(category: Category) -> CategoryPublic:
    return CategoryPublic(
        id=str(category.id),
        slug=category.slug,
        name=category.name,
        description=category.description,
        parent_id=str(category.parent_id) if category.parent_id else None,
        sort_order=category.sort_order,
        is_featured=category.is_featured,
        image_url=category.image_url,
    )


async def _to_detail(category: Category) -> CategoryDetail:
    base = _to_public(category)
    count = await count_products_by_slug(category.slug)
    return CategoryDetail(
        **base.model_dump(),
        is_active=category.is_active,
        product_count=count,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


async def _get_or_404(category_id: str) -> Category:
    try:
        oid = PydanticObjectId(category_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy danh mục",
        ) from exc
    category = await Category.get(oid)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy danh mục")
    return category


async def _get_by_slug_or_404(slug: str) -> Category:
    normalized = slug.strip().lower()
    category = await Category.find_one(Category.slug == normalized)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy danh mục")
    return category


async def _resolve_parent_id(
    parent_id: str | None,
    *,
    exclude_id: PydanticObjectId | None = None,
) -> PydanticObjectId | None:
    if parent_id is None:
        return None
    try:
        oid = PydanticObjectId(parent_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="parent_id không hợp lệ",
        ) from exc
    if exclude_id is not None and oid == exclude_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh mục không thể là cha của chính nó",
        )
    parent = await Category.get(oid)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh mục cha không tồn tại")
    return oid


async def _validate_no_parent_cycle(category: Category) -> None:
    if category.parent_id is None:
        return
    visited: set[PydanticObjectId] = {category.id}
    current_id = category.parent_id
    while current_id is not None:
        if current_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cây danh mục không hợp lệ (vòng lặp)",
            )
        visited.add(current_id)
        parent = await Category.get(current_id)
        if parent is None:
            break
        current_id = parent.parent_id


def _build_tree(flat: list[CategoryPublic]) -> list[CategoryTreeNode]:
    nodes: dict[str, CategoryTreeNode] = {
        item.id: CategoryTreeNode(**item.model_dump(), children=[]) for item in flat
    }
    roots: list[CategoryTreeNode] = []
    for item in flat:
        node = nodes[item.id]
        if item.parent_id and item.parent_id in nodes:
            nodes[item.parent_id].children.append(node)
        else:
            roots.append(node)
    return roots
