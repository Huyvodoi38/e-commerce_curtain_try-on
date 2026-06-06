import { ProductCarousel } from '@/features/products/components/ProductCarousel'
import { useProductRecommendationsQuery } from '@/features/products/hooks'

type Props = {
  productId: string
}

export function RecommendedProducts({ productId }: Props) {
  const recommendationsQuery = useProductRecommendationsQuery(productId, 6)

  if (recommendationsQuery.isError) {
    return null
  }

  const items = recommendationsQuery.data?.items ?? []
  if (!recommendationsQuery.isLoading && items.length === 0) {
    return null
  }

  return (
    <section className="mt-10" aria-labelledby="recommended-products-heading">
      <h2 id="recommended-products-heading" className="mb-4 text-lg font-semibold text-foreground">
        Có thể bạn quan tâm
      </h2>
      <ProductCarousel
        products={items}
        isLoading={recommendationsQuery.isLoading}
        loadingCount={3}
        listAriaLabel="Sản phẩm gợi ý"
      />
    </section>
  )
}
