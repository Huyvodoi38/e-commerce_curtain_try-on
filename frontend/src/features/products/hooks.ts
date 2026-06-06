import { useQuery } from '@tanstack/react-query'
import {
  fetchProductDetail,
  fetchProductRecommendations,
  fetchProducts,
  type ProductsQueryParams,
} from './api'

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

export function useProductRecommendationsQuery(productId: string, limit = 6) {
  return useQuery({
    queryKey: ['products', 'recommendations', productId, limit],
    queryFn: () => fetchProductRecommendations(productId, limit),
    enabled: Boolean(productId),
    staleTime: STALE_MS,
  })
}

const SEARCH_SUGGEST_MIN_LEN = 2

export function useProductSearchSuggestionsQuery(search: string, limit = 6) {
  const trimmed = search.trim()
  return useQuery({
    queryKey: ['products', 'search-suggestions', trimmed, limit],
    queryFn: () => fetchProducts({ search: trimmed, page: 1, page_size: limit }),
    enabled: trimmed.length >= SEARCH_SUGGEST_MIN_LEN,
    staleTime: 30_000,
  })
}
