import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { useMeQuery } from '@/features/auth/hooks'
import { formatReviewDate, StarRating } from '@/features/reviews/components/StarRating'
import {
  useDeleteReviewMutation,
  useProductReviewsQuery,
  useSubmitProductReviewMutation,
  useUpdateReviewMutation,
} from '@/features/reviews/hooks'
import type { ReviewPublic } from '@/features/reviews/types'
import { getErrorMessage } from '@/lib/api/client'
import { loginPathWithRedirect } from '@/lib/auth/paths'

type Props = {
  productId: string
  ratingAvg: number | null
  ratingCount: number
}

export function ProductReviewSection({ productId, ratingAvg, ratingCount }: Props) {
  const location = useLocation()
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const pageSize = 5

  const reviewsQuery = useProductReviewsQuery(productId, page, pageSize)
  const isCustomer = meQuery.data?.role === 'customer'
  const myReview = reviewsQuery.data?.my_review ?? null

  useEffect(() => {
    setPage(1)
  }, [productId])

  const totalPages = resolveTotalPages(
    reviewsQuery.data?.total ?? ratingCount,
    pageSize,
    reviewsQuery.data?.pages,
  )

  return (
    <section
      className="mt-10 overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-sm"
      aria-labelledby="product-reviews-heading"
    >
      <div className="border-b border-border bg-gradient-to-r from-surface-muted/90 to-surface-raised px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="product-reviews-heading" className="text-sm font-semibold text-foreground">
            Đánh giá sản phẩm
          </h2>
          {ratingCount > 0 && ratingAvg != null ? (
            <div className="flex items-center gap-2 text-sm">
              <StarRating value={ratingAvg} label={`${ratingAvg} trên 5 sao`} />
              <span className="font-semibold text-foreground">{ratingAvg.toFixed(1)}</span>
              <span className="text-foreground-subtle">({ratingCount} đánh giá)</span>
            </div>
          ) : (
            <span className="text-sm text-foreground-subtle">Chưa có đánh giá</span>
          )}
        </div>
      </div>

      <div className="space-y-0">
        {isCustomer ? (
          <ReviewForm productId={productId} existingReview={myReview} />
        ) : (
          <div className="border-b border-border-subtle px-5 py-4 text-sm text-foreground-muted">
            <Link to={loginPathWithRedirect(location.pathname)} className="font-medium text-brand hover:underline">
              Đăng nhập
            </Link>{' '}
            để viết đánh giá.
          </div>
        )}

        {reviewsQuery.isLoading ? (
          <p className="px-5 py-6 text-sm text-foreground-subtle">Đang tải đánh giá…</p>
        ) : reviewsQuery.isError ? (
          <p className="px-5 py-6 text-sm text-danger-700">
            Không tải được đánh giá: {getErrorMessage(reviewsQuery.error)}
          </p>
        ) : reviewsQuery.data && reviewsQuery.data.items.length > 0 ? (
          <ul className="divide-y divide-border-subtle">
            {reviewsQuery.data.items.map((review) => (
              <ReviewListItem
                key={review.id}
                review={review}
                productId={productId}
                canManage={isCustomer && review.is_mine}
              />
            ))}
          </ul>
        ) : reviewsQuery.data && reviewsQuery.data.total > 0 ? (
          <p className="px-5 py-6 text-sm text-foreground-subtle">Không có đánh giá ở trang này.</p>
        ) : (
          <p className="px-5 py-6 text-sm text-foreground-subtle">Hãy là người đầu tiên đánh giá sản phẩm này.</p>
        )}

        {totalPages > 1 ? (
          <div className="border-t border-border-subtle px-5 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ReviewForm({ productId, existingReview }: { productId: string; existingReview: ReviewPublic | null }) {
  const [rating, setRating] = useState(existingReview?.rating ?? 5)
  const [comment, setComment] = useState(existingReview?.comment ?? '')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(!existingReview)

  const submitMutation = useSubmitProductReviewMutation(productId)
  const updateMutation = useUpdateReviewMutation(productId)

  useEffect(() => {
    setRating(existingReview?.rating ?? 5)
    setComment(existingReview?.comment ?? '')
    setEditing(!existingReview)
  }, [existingReview])

  async function handleSubmit() {
    setError(null)
    const body = { rating, comment: comment.trim() || null }
    try {
      if (existingReview) {
        await updateMutation.mutateAsync({ reviewId: existingReview.id, body })
        setEditing(false)
      } else {
        await submitMutation.mutateAsync(body)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const pending = submitMutation.isPending || updateMutation.isPending

  if (existingReview && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-surface-muted/30 px-5 py-4">
        <p className="text-sm text-foreground-muted">Bạn đã đánh giá sản phẩm này.</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand hover:underline"
        >
          Sửa đánh giá
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-border-subtle bg-surface-muted/30 px-5 py-4">
      <p className="mb-3 text-sm font-medium text-foreground">
        {existingReview ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}
      </p>
      <div className="space-y-3">
        <StarRating value={rating} interactive onChange={setRating} label="Chọn số sao" />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Chia sẻ trải nghiệm về rèm (tùy chọn)"
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {pending ? 'Đang gửi…' : existingReview ? 'Cập nhật' : 'Gửi đánh giá'}
          </button>
          {existingReview ? (
            <button
              type="button"
              onClick={() => {
                setRating(existingReview.rating)
                setComment(existingReview.comment ?? '')
                setEditing(false)
                setError(null)
              }}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
            >
              Hủy
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ReviewListItem({
  review,
  productId,
  canManage,
}: {
  review: ReviewPublic
  productId: string
  canManage: boolean
}) {
  const deleteMutation = useDeleteReviewMutation(productId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    try {
      await deleteMutation.mutateAsync(review.id)
      setConfirmDelete(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{review.author_name}</span>
            {review.source === 'admin' ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground-subtle">Admin</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={review.rating} size="sm" label={`${review.rating} sao`} />
            <span className="text-xs text-foreground-subtle">{formatReviewDate(review.created_at)}</span>
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-danger-700 hover:underline"
              >
                Xóa
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleteMutation.isPending}
                  className="text-xs font-medium text-danger-700 hover:underline disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Đang xóa…' : 'Xác nhận xóa'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-foreground-muted hover:underline"
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {review.comment ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted whitespace-pre-line">{review.comment}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger-700">{error}</p> : null}
    </li>
  )
}
