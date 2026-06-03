import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
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
  const totalPages = resolveTotalPages(data?.total ?? 0, PAGE_SIZE, data?.pages)

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
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            ariaLabel="Phân trang sản phẩm"
          />
        </>
      ) : null}
    </PageShell>
  )
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
