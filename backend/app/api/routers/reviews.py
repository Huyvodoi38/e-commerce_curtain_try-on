"""Router đánh giá sản phẩm — storefront + admin."""

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.api.dependencies import get_optional_active_user, require_customer, require_manager, require_staff
from app.api.schemas.review import (
    AdminReviewCreate,
    AdminReviewListResponse,
    AdminReviewPublic,
    ReviewCreate,
    ReviewListResponse,
    ReviewPublic,
    ReviewUpdate,
)
from app.models.enums import ReviewSource
from app.models.user import User
from app.services import review_service

product_reviews_router = APIRouter(prefix="/products", tags=["reviews"])
reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])
admin_reviews_router = APIRouter(prefix="/admin/reviews", tags=["admin-reviews"])


@product_reviews_router.get("/{product_id}/reviews", response_model=ReviewListResponse)
async def list_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User | None = Depends(get_optional_active_user),
) -> ReviewListResponse:
    """Danh sách đánh giá của sản phẩm — guest được xem."""

    return await review_service.list_product_reviews(
        product_id,
        page=page,
        page_size=page_size,
        viewer=current_user,
    )


@product_reviews_router.post(
    "/{product_id}/reviews",
    response_model=ReviewPublic,
    responses={
        status.HTTP_200_OK: {"model": ReviewPublic},
        status.HTTP_201_CREATED: {"model": ReviewPublic},
    },
)
async def create_or_update_product_review(
    product_id: str,
    data: ReviewCreate,
    customer: User = Depends(require_customer),
) -> JSONResponse:
    """Khách hàng gửi hoặc cập nhật đánh giá (một user / một sản phẩm)."""

    review, created = await review_service.upsert_customer_review(product_id, data, customer)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        content=review.model_dump(mode="json"),
    )


@reviews_router.patch("/{review_id}", response_model=ReviewPublic)
async def update_review(
    review_id: str,
    data: ReviewUpdate,
    customer: User = Depends(require_customer),
) -> ReviewPublic:
    """Khách hàng sửa đánh giá của mình."""

    return await review_service.update_customer_review(review_id, data, customer)


@reviews_router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    customer: User = Depends(require_customer),
) -> None:
    """Khách hàng xóa đánh giá của mình."""

    await review_service.delete_customer_review(review_id, customer)


@admin_reviews_router.get("", response_model=AdminReviewListResponse)
async def list_admin_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: str | None = None,
    rating: int | None = Query(None, ge=1, le=5),
    source: ReviewSource | None = None,
    search: str | None = None,
    _: User = Depends(require_staff),
) -> AdminReviewListResponse:
    """Danh sách đánh giá — nhân viên / quản lý."""

    return await review_service.list_admin_reviews(
        page=page,
        page_size=page_size,
        product_id=product_id,
        rating=rating,
        source=source,
        search=search,
    )


@admin_reviews_router.post("", response_model=AdminReviewPublic, status_code=status.HTTP_201_CREATED)
async def create_admin_review(
    data: AdminReviewCreate,
    manager: User = Depends(require_manager),
) -> AdminReviewPublic:
    """Quản lý thêm đánh giá thủ công."""

    return await review_service.create_admin_review(data, manager)


@admin_reviews_router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_review(
    review_id: str,
    actor: User = Depends(require_staff),
) -> None:
    """Xóa đánh giá — nhân viên / quản lý."""

    await review_service.delete_admin_review(review_id, actor)
