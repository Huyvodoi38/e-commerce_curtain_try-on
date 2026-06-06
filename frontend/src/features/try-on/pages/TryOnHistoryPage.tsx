import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { useTryOnHistoryQuery } from '@/features/try-on/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'

export function TryOnHistoryPage() {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const historyQuery = useTryOnHistoryQuery(page, pageSize)
  const totalPages = resolveTotalPages(
    historyQuery.data?.total ?? 0,
    pageSize,
    historyQuery.data?.pages,
  )

  return (
    <PageShell title="Lịch sử thử rèm AI" description="Các kết quả bạn đã lưu">
      {historyQuery.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
      ) : null}

      {historyQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(historyQuery.error)}
        </p>
      ) : null}

      {historyQuery.data?.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
          <p className="text-foreground-muted">Chưa có kết quả try-on nào được lưu.</p>
          <Link to="/products" className="mt-3 inline-block text-sm text-brand hover:underline">
            Xem sản phẩm
          </Link>
        </div>
      ) : null}

      {historyQuery.data && historyQuery.data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {historyQuery.data.items.map((item) => {
            const resultSrc = item.result_url
              ? (cdnImage(item.result_url, cdnPresets.productDetail) ?? item.result_url)
              : null
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-surface-raised"
              >
                <div className="aspect-[4/3] bg-surface-muted">
                  {resultSrc ? (
                    <img src={resultSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-foreground-subtle">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-4 text-sm">
                  <p className="font-medium">{item.product_name ?? 'Sản phẩm'}</p>
                  <p className="text-xs text-foreground-subtle">
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </p>
                  {item.product_id ? (
                    <Link
                      to={`/products/${item.product_id}`}
                      className="inline-block text-xs text-brand hover:underline"
                    >
                      Xem sản phẩm
                    </Link>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {historyQuery.data && historyQuery.data.total > pageSize ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang lịch sử try-on"
        />
      ) : null}
    </PageShell>
  )
}
