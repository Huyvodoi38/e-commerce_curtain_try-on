"""Nghiệp vụ đánh giá sản phẩm."""

from __future__ import annotations

import math
import re
from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.api.schemas.review import (
    AdminReviewCreate,
    AdminReviewListResponse,
    AdminReviewPublic,
    ReviewCreate,
    ReviewListResponse,
    ReviewPublic,
    ReviewUpdate,
)
from app.models.common import utc_now
from app.models.enums import ActivityAction, ReviewSource
from app.models.product import Product
from app.models.review import ProductReview
from app.models.user import User
from app.services import audit_service


def _parse_product_id(value: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm",
        ) from exc


def _parse_review_id(value: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đánh giá",
        ) from exc


def _review_to_public(review: ProductReview, *, viewer_id: PydanticObjectId | None = None) -> ReviewPublic:
    is_mine = viewer_id is not None and review.user_id == viewer_id
    return ReviewPublic(
        id=str(review.id),
        product_id=str(review.product_id),
        author_name=review.author_name,
        rating=review.rating,
        comment=review.comment,
        source=review.source,
        created_at=review.created_at,
        updated_at=review.updated_at,
        is_mine=is_mine,
    )


async def _get_active_product_or_404(product_id: PydanticObjectId) -> Product:
    product = await Product.get(product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    return product


async def _get_product_or_404(product_id: PydanticObjectId) -> Product:
    product = await Product.get(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    return product


async def recalc_product_ratings(product_id: PydanticObjectId) -> None:
    """Cập nhật rating_avg và rating_count trên Product."""

    product = await Product.get(product_id)
    if product is None:
        return

    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": None, "count": {"$sum": 1}, "avg": {"$avg": "$rating"}}},
    ]
    rows = await ProductReview.aggregate(pipeline).to_list()

    if not rows or int(rows[0].get("count") or 0) == 0:
        product.rating_avg = None
        product.rating_count = 0
    else:
        row = rows[0]
        product.rating_avg = round(float(row["avg"]), 1)
        product.rating_count = int(row["count"])
    product.updated_at = utc_now()
    await product.save()


async def list_product_reviews(
    product_id: str,
    *,
    page: int,
    page_size: int,
    viewer: User | None = None,
) -> ReviewListResponse:
    pid = _parse_product_id(product_id)
    await _get_active_product_or_404(pid)

    query = ProductReview.find(ProductReview.product_id == pid).sort("-created_at")
    total = await query.count()
    skip = (page - 1) * page_size
    reviews = await query.skip(skip).limit(page_size).to_list()
    pages = max(1, math.ceil(total / page_size)) if total else 0

    viewer_id = viewer.id if viewer else None
    my_review_doc = None
    if viewer_id is not None:
        my_review_doc = await ProductReview.find_one(
            ProductReview.product_id == pid,
            ProductReview.user_id == viewer_id,
        )

    return ReviewListResponse(
        items=[_review_to_public(item, viewer_id=viewer_id) for item in reviews],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        my_review=_review_to_public(my_review_doc, viewer_id=viewer_id) if my_review_doc else None,
    )


async def _assert_customer_owns_active_review(review: ProductReview, customer: User) -> None:
    if review.user_id != customer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền thao tác đánh giá này")
    if review.source != ReviewSource.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không thể thao tác đánh giá do admin tạo")

    product = await Product.get(review.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")


async def upsert_customer_review(
    product_id: str,
    data: ReviewCreate,
    customer: User,
) -> tuple[ReviewPublic, bool]:
    """Tạo hoặc cập nhật review — trả về (review, created)."""

    pid = _parse_product_id(product_id)
    await _get_active_product_or_404(pid)

    existing = await ProductReview.find_one(
        ProductReview.product_id == pid,
        ProductReview.user_id == customer.id,
    )
    now = utc_now()
    if existing:
        existing.rating = data.rating
        existing.comment = data.comment
        existing.author_name = customer.full_name
        existing.updated_at = now
        await existing.save()
        review = existing
        created = False
    else:
        review = ProductReview(
            product_id=pid,
            user_id=customer.id,
            author_name=customer.full_name,
            rating=data.rating,
            comment=data.comment,
            source=ReviewSource.CUSTOMER,
            created_at=now,
            updated_at=now,
        )
        try:
            await review.insert()
        except DuplicateKeyError:
            existing = await ProductReview.find_one(
                ProductReview.product_id == pid,
                ProductReview.user_id == customer.id,
            )
            if existing is None:
                raise
            existing.rating = data.rating
            existing.comment = data.comment
            existing.author_name = customer.full_name
            existing.updated_at = now
            await existing.save()
            review = existing
            created = False
        else:
            created = True
            await audit_service.log_activity(
                actor=customer,
                action=ActivityAction.REVIEW_CREATED,
                metadata={"review_id": str(review.id), "product_id": str(pid), "rating": data.rating},
            )

    await recalc_product_ratings(pid)
    return _review_to_public(review, viewer_id=customer.id), created


async def update_customer_review(
    review_id: str,
    data: ReviewUpdate,
    customer: User,
) -> ReviewPublic:
    rid = _parse_review_id(review_id)
    review = await ProductReview.get(rid)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    await _assert_customer_owns_active_review(review, customer)

    review.rating = data.rating
    review.comment = data.comment
    review.updated_at = utc_now()
    await review.save()
    await recalc_product_ratings(review.product_id)
    return _review_to_public(review, viewer_id=customer.id)


async def delete_customer_review(review_id: str, customer: User) -> None:
    rid = _parse_review_id(review_id)
    review = await ProductReview.get(rid)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    await _assert_customer_owns_active_review(review, customer)

    product_id = review.product_id
    await review.delete()
    await recalc_product_ratings(product_id)
    await audit_service.log_activity(
        actor=customer,
        action=ActivityAction.REVIEW_DELETED,
        metadata={"review_id": str(rid), "product_id": str(product_id)},
    )


async def list_admin_reviews(
    *,
    page: int,
    page_size: int,
    product_id: str | None = None,
    rating: int | None = None,
    source: ReviewSource | None = None,
    search: str | None = None,
) -> AdminReviewListResponse:
    filters: list[Any] = []
    if product_id:
        filters.append(ProductReview.product_id == _parse_product_id(product_id))
    if rating is not None:
        filters.append(ProductReview.rating == rating)
    if source is not None:
        filters.append(ProductReview.source == source)
    if search and search.strip():
        pattern = re.escape(search.strip())
        filters.append(
            {
                "$or": [
                    {"author_name": {"$regex": pattern, "$options": "i"}},
                    {"comment": {"$regex": pattern, "$options": "i"}},
                ]
            }
        )

    query = ProductReview.find(*filters).sort("-created_at") if filters else ProductReview.find().sort("-created_at")
    total = await query.count()
    skip = (page - 1) * page_size
    reviews = await query.skip(skip).limit(page_size).to_list()
    pages = max(1, math.ceil(total / page_size)) if total else 0

    product_ids = list({item.product_id for item in reviews})
    products = await Product.find({"_id": {"$in": product_ids}}).to_list() if product_ids else []
    product_names = {product.id: product.name for product in products}

    items = [
        AdminReviewPublic(
            id=str(review.id),
            product_id=str(review.product_id),
            product_name=product_names.get(review.product_id, "—"),
            user_id=str(review.user_id) if review.user_id else None,
            author_name=review.author_name,
            rating=review.rating,
            comment=review.comment,
            source=review.source,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
        for review in reviews
    ]
    return AdminReviewListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def create_admin_review(data: AdminReviewCreate, manager: User) -> AdminReviewPublic:
    pid = _parse_product_id(data.product_id)
    product = await _get_product_or_404(pid)

    now = utc_now()
    review = ProductReview(
        product_id=pid,
        user_id=None,
        author_name=data.author_name,
        rating=data.rating,
        comment=data.comment,
        source=ReviewSource.ADMIN,
        created_at=now,
        updated_at=now,
    )
    await review.insert()
    await recalc_product_ratings(pid)
    await audit_service.log_activity(
        actor=manager,
        action=ActivityAction.REVIEW_CREATED_ADMIN,
        metadata={
            "review_id": str(review.id),
            "product_id": str(pid),
            "rating": data.rating,
            "author_name": data.author_name,
        },
    )
    return AdminReviewPublic(
        id=str(review.id),
        product_id=str(review.product_id),
        product_name=product.name,
        user_id=None,
        author_name=review.author_name,
        rating=review.rating,
        comment=review.comment,
        source=review.source,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


async def delete_admin_review(review_id: str, actor: User) -> None:
    rid = _parse_review_id(review_id)
    review = await ProductReview.get(rid)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    product_id = review.product_id
    await review.delete()
    await recalc_product_ratings(product_id)
    await audit_service.log_activity(
        actor=actor,
        action=ActivityAction.REVIEW_DELETED_ADMIN,
        metadata={"review_id": str(rid), "product_id": str(product_id)},
    )
