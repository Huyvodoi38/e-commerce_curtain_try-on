import { useState } from 'react'
import { PageShell } from '@/components/common/PageShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useMeQuery } from '@/features/auth/hooks'
import { formatReviewDate, StarRating } from '@/features/reviews/components/StarRating'
import {
  useAdminReviewsQuery,
  useCreateAdminReviewMutation,
  useDeleteAdminReviewMutation,
} from '@/features/reviews/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { canDeleteReviews, canManageReviews, canViewAdminReviews } from '@/lib/permissions/permissions'

export function AdminReviewsPage() {
  const meQuery = useMeQuery()
  const role = meQuery.data?.role
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [productIdFilter, setProductIdFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'customer' | 'admin'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [productId, setProductId] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const pageSize = 10

  const canView = role ? canViewAdminReviews(role) : false
  const canCreate = role ? canManageReviews(role) : false
  const canDelete = role ? canDeleteReviews(role) : false

  const reviewsQuery = useAdminReviewsQuery({
    page,
    page_size: pageSize,
    search: search || undefined,
    product_id: productIdFilter || undefined,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
  })
  const createMutation = useCreateAdminReviewMutation()
  const deleteMutation = useDeleteAdminReviewMutation()

  const totalPages = resolveTotalPages(
    reviewsQuery.data?.total ?? 0,
    pageSize,
    reviewsQuery.data?.pages,
  )

  if (meQuery.isLoading) {
    return (
      <PageShell title="Đánh giá sản phẩm">
        <p className="text-sm text-foreground-muted">Đang tải…</p>
      </PageShell>
    )
  }

  if (!canView) {
    return (
      <PageShell title="Đánh giá sản phẩm">
        <p className="text-sm text-foreground-muted">Bạn không có quyền truy cập trang này.</p>
      </PageShell>
    )
  }

  async function handleCreate() {
    if (!productId.trim() || !authorName.trim()) return
    await createMutation.mutateAsync({
      product_id: productId.trim(),
      author_name: authorName.trim(),
      rating,
      comment: comment.trim() || null,
    })
    setShowCreate(false)
    setProductId('')
    setAuthorName('')
    setRating(5)
    setComment('')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <PageShell title="Đánh giá sản phẩm">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FormField label="Tìm kiếm" htmlFor="review-search">
          <input
            id="review-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tên người đánh giá, nội dung…"
            className={inputClassName}
          />
        </FormField>
        <div className="min-w-[10rem] flex-1">
          <FormField label="Product ID" htmlFor="review-product-filter">
            <input
              id="review-product-filter"
              value={productIdFilter}
              onChange={(e) => {
                setProductIdFilter(e.target.value)
                setPage(1)
              }}
              placeholder="Lọc theo SP"
              className={inputClassName}
            />
          </FormField>
        </div>
        <FormField label="Nguồn" htmlFor="review-source-filter">
          <select
            id="review-source-filter"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as 'all' | 'customer' | 'admin')
              setPage(1)
            }}
            className={inputClassName}
          >
            <option value="all">Tất cả</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Admin</option>
          </select>
        </FormField>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
          >
            {showCreate ? 'Đóng form' : 'Thêm đánh giá'}
          </button>
        ) : null}
      </div>

      {showCreate && canCreate ? (
        <div className="mb-6 rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="text-sm font-semibold text-foreground">Thêm đánh giá thủ công</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Product ID" htmlFor="create-review-product">
              <input
                id="create-review-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Tên hiển thị" htmlFor="create-review-author">
              <input
                id="create-review-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className={inputClassName}
              />
            </FormField>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm text-foreground-muted">Số sao</p>
            <StarRating value={rating} interactive onChange={setRating} label="Chọn số sao" />
          </div>
          <FormField label="Nội dung" htmlFor="create-review-comment">
            <textarea
              id="create-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              className={inputClassName}
            />
          </FormField>
          {createMutation.isError ? (
            <p className="mt-3 text-sm text-danger-700">{getErrorMessage(createMutation.error)}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={createMutation.isPending || !productId.trim() || !authorName.trim()}
            className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {createMutation.isPending ? 'Đang tạo…' : 'Tạo đánh giá'}
          </button>
        </div>
      ) : null}

      {reviewsQuery.isLoading ? (
        <p className="text-sm text-foreground-muted">Đang tải danh sách…</p>
      ) : reviewsQuery.isError ? (
        <p className="text-sm text-danger-700">{getErrorMessage(reviewsQuery.error)}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Sản phẩm</th>
                <th className="px-4 py-3 font-medium">Người đánh giá</th>
                <th className="px-4 py-3 font-medium">Sao</th>
                <th className="px-4 py-3 font-medium">Nội dung</th>
                <th className="px-4 py-3 font-medium">Ngày</th>
                {canDelete ? <th className="px-4 py-3 font-medium">Thao tác</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {reviewsQuery.data?.items.map((review) => (
                <tr key={review.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-foreground">{review.product_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-foreground-subtle">{review.product_id}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-foreground">{review.author_name}</p>
                    <p className="text-xs text-foreground-subtle">
                      {review.source === 'admin' ? 'Admin' : 'Khách hàng'}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StarRating value={review.rating} size="sm" label={`${review.rating} sao`} />
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top text-foreground-muted">
                    {review.comment ? (
                      <span className="line-clamp-3 whitespace-pre-line">{review.comment}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-foreground-subtle">{formatReviewDate(review.created_at)}</td>
                  {canDelete ? (
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            id: review.id,
                            label: `${review.author_name} — ${review.product_name}`,
                          })
                        }
                        className="text-danger-700 hover:underline"
                      >
                        Xóa
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {reviewsQuery.data && reviewsQuery.data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-foreground-subtle">Không có đánh giá.</p>
          ) : null}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Xóa đánh giá"
          description={`Xóa đánh giá "${deleteTarget.label}"? Hành động không thể hoàn tác.`}
          confirmLabel="Xóa"
          variant="danger"
          pending={deleteMutation.isPending}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </PageShell>
  )
}
