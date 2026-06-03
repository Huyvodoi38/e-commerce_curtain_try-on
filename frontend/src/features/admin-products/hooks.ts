import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deactivateProduct,
  fetchAdminProductDetail,
  fetchAdminProducts,
  patchProduct,
  patchProductStock,
} from '@/features/admin-products/api'
import type { ProductCreateBody, ProductPatchBody } from '@/features/admin-products/types'

export const adminProductsQueryKey = (params: {
  page: number
  page_size: number
  search?: string
  include_inactive?: boolean
}) => ['admin-products', params] as const

export function useAdminProductsQuery(params: {
  page: number
  page_size: number
  search?: string
  include_inactive?: boolean
}) {
  return useQuery({
    queryKey: adminProductsQueryKey(params),
    queryFn: () => fetchAdminProducts(params),
  })
}

export function useAdminProductDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: ['admin-products', id],
    queryFn: () => fetchAdminProductDetail(id),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProductCreateBody) => createProduct(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
    },
  })
}

export function usePatchProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProductPatchBody }) => patchProduct(id, body),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
      void qc.invalidateQueries({ queryKey: ['admin-products', vars.id] })
    },
  })
}

export function usePatchProductStockMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      patchProductStock(id, { stock }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
    },
  })
}

export function useDeactivateProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
    },
  })
}
