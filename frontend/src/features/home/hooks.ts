import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '@/features/products/api'

const STALE_MS = 60 * 1000

export function useHomeNewProductsQuery() {
  return useQuery({
    queryKey: ['products', 'home', 'new'],
    queryFn: () =>
      fetchProducts({
        page_size: 6,
        sort: 'created_at',
        order: 'desc',
        in_stock_only: true,
      }),
    staleTime: STALE_MS,
  })
}

export function useHomeSaleProductsQuery() {
  return useQuery({
    queryKey: ['products', 'home', 'sale'],
    queryFn: () => fetchProducts({ page_size: 30, in_stock_only: true }),
    select: (data) => data.items.filter((item) => item.is_on_sale).slice(0, 6),
    staleTime: STALE_MS,
  })
}
