import { HomeSectionHeader } from '@/features/home/components/HomeSectionHeader'
import { useHomeNewProductsQuery, useHomeSaleProductsQuery } from '@/features/home/hooks'
import { ProductCarousel } from '@/features/products/components/ProductCarousel'
import { ProductCard } from '@/features/products/components/ProductCard'

export function HomeNewProducts() {
  const productsQuery = useHomeNewProductsQuery()

  if (productsQuery.isError) {
    return null
  }

  const items = productsQuery.data?.items ?? []

  return (
    <section aria-labelledby="home-new-products-heading">
      <HomeSectionHeader title="Sản phẩm mới" headingId="home-new-products-heading" viewAllTo="/products" />
      {productsQuery.isLoading ? (
        <ProductCarousel products={[]} isLoading loadingCount={3} listAriaLabel="Sản phẩm mới" />
      ) : items.length > 0 ? (
        <ProductCarousel products={items} listAriaLabel="Sản phẩm mới" />
      ) : (
        <p className="text-sm text-foreground-subtle">Chưa có sản phẩm mới.</p>
      )}
    </section>
  )
}

export function HomeSaleProducts() {
  const productsQuery = useHomeSaleProductsQuery()

  if (productsQuery.isError) {
    return null
  }

  const items = productsQuery.data ?? []

  if (productsQuery.isLoading) {
    return (
      <section aria-labelledby="home-sale-products-heading">
        <HomeSectionHeader
          title="Đang giảm giá"
          headingId="home-sale-products-heading"
          viewAllTo="/products"
          viewAllLabel="Xem thêm"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface-raised">
              <div className="aspect-[4/3] animate-pulse bg-surface-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="home-sale-products-heading">
      <HomeSectionHeader
        title="Đang giảm giá"
        headingId="home-sale-products-heading"
        viewAllTo="/products"
        viewAllLabel="Xem thêm"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
