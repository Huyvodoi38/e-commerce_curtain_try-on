import { useQuery } from '@tanstack/react-query'
import { fetchProductDetail, fetchProducts, type ProductsQueryParams } from './api'

const STALE_MS = 60 * 1000

export function useProductsQuery(params: ProductsQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    staleTime: STALE_MS,
  })
}

export function useProductDetailQuery(id: string) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => fetchProductDetail(id),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  })
}
