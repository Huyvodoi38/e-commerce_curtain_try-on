import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { getErrorMessage } from '@/lib/api/client'
import { productPrimaryImageUrl } from '@/lib/products/images'
import { formatVnd } from '@/lib/utils/formatCurrency'
import { useCategoryQuery } from '@/features/categories/hooks'
import { useProductsQuery } from '@/features/products/hooks'
import { productDetailPath } from '@/lib/catalog/products'

const PAGE_SIZE = 12

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const search = (searchParams.get('search') ?? '').trim()
  const category = (searchParams.get('category') ?? '').trim()

  const productsQuery = useProductsQuery({
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    category: category || undefined,
    in_stock_only: true,
  })

  const categoryQuery = useCategoryQuery(category)

  const pageTitle = category
    ? (categoryQuery.data?.name ?? category)
    : search
      ? 'Kết quả tìm kiếm'
      : 'Sản phẩm'

  const pageDescription = category
    ? (categoryQuery.data?.description ?? undefined)
    : search
      ? search
      : undefined

  const data = productsQuery.data
  const totalPages = Math.max(data?.pages ?? 1, 1)

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams)
    if (nextPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(nextPage))
    }
    setSearchParams(params)
  }

  return (
    <PageShell title={pageTitle} description={pageDescription}>
      {productsQuery.isLoading ? <LoadingGrid /> : null}

      {productsQuery.isError ? (
        <div className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          Không tải được danh sách sản phẩm: {getErrorMessage(productsQuery.error)}
        </div>
      ) : null}

      {!productsQuery.isLoading && !productsQuery.isError && data && data.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised p-8 text-center text-foreground-subtle">
          Không có sản phẩm phù hợp.
        </div>
      ) : null}

      {!productsQuery.isLoading && !productsQuery.isError && data && data.items.length > 0 ? (
        <>
          <div className="mb-4 text-sm text-foreground-subtle">Tìm thấy {data.total} sản phẩm</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => {
              const thumb = productPrimaryImageUrl(item)
              return (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-surface-raised transition-shadow hover:shadow-md"
              >
                <Link to={productDetailPath(item.id)} className="block">
                  <div className="aspect-[4/3] bg-surface-muted">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-foreground-subtle">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>
                </Link>
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-2 font-medium text-foreground">
                    <Link to={productDetailPath(item.id)} className="hover:text-brand">
                      {item.name}
                    </Link>
                  </h3>
                  <p className="line-clamp-2 text-sm text-foreground-muted">
                    {item.description ?? 'Đang cập nhật mô tả sản phẩm.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand">{formatVnd(item.effective_price)}</span>
                    {item.is_on_sale && item.sale_price ? (
                      <span className="text-sm text-foreground-subtle line-through">
                        {formatVnd(item.price)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-foreground-subtle">
                    {item.stock > 0 ? `Còn ${item.stock}` : 'Hết hàng'}
                  </div>
                </div>
              </article>
            )})}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trang trước
            </button>
            <nav aria-label="Phân trang sản phẩm" className="flex items-center gap-1">
              {buildPaginationTokens(page, totalPages).map((token, idx) =>
                token === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-sm text-foreground-subtle"
                    aria-hidden
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={token}
                    type="button"
                    onClick={() => goToPage(token)}
                    className={`min-w-8 rounded-md px-2 py-1.5 text-sm ${
                      token === page
                        ? 'bg-brand text-on-brand'
                        : 'text-foreground-muted hover:bg-surface-muted'
                    }`}
                    aria-current={token === page ? 'page' : undefined}
                  >
                    {token}
                  </button>
                ),
              )}
            </nav>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        </>
      ) : null}
    </PageShell>
  )
}

type PaginationToken = number | 'ellipsis'

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 8) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  if (currentPage <= 4) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
    pages.add(5)
  }
  if (currentPage >= totalPages - 3) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
    pages.add(totalPages - 4)
  }

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const tokens: PaginationToken[] = []
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i]
    const prev = sorted[i - 1]
    if (i > 0 && page - prev > 1) tokens.push('ellipsis')
    tokens.push(page)
  }
  return tokens
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <div className="aspect-[4/3] animate-pulse bg-surface-muted" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
