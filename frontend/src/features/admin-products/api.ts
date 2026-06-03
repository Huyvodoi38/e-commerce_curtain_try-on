import { apiClient } from '@/lib/api/client'
import type {
  AdminProductDetail,
  AdminProductListResponse,
  ProductCreateBody,
  ProductPatchBody,
  ProductStockPatchBody,
} from '@/features/admin-products/types'

export async function fetchAdminProducts(params: {
  page?: number
  page_size?: number
  search?: string
  category?: string
  include_inactive?: boolean
  sort?: 'created_at' | 'price' | 'name'
  order?: 'asc' | 'desc'
}): Promise<AdminProductListResponse> {
  const { data } = await apiClient.get<AdminProductListResponse>('/products', { params })
  return data
}

export async function fetchAdminProductDetail(id: string): Promise<AdminProductDetail> {
  const { data } = await apiClient.get<AdminProductDetail>(`/products/${id}`)
  return data
}

export async function createProduct(body: ProductCreateBody): Promise<AdminProductDetail> {
  const { data } = await apiClient.post<AdminProductDetail>('/products', body)
  return data
}

export async function patchProduct(id: string, body: ProductPatchBody): Promise<AdminProductDetail> {
  const { data } = await apiClient.patch<AdminProductDetail>(`/products/${id}`, body)
  return data
}

export async function patchProductStock(
  id: string,
  body: ProductStockPatchBody,
): Promise<AdminProductDetail> {
  const { data } = await apiClient.patch<AdminProductDetail>(`/products/${id}/stock`, body)
  return data
}

export async function deactivateProduct(id: string): Promise<AdminProductDetail> {
  const { data } = await apiClient.delete<AdminProductDetail>(`/products/${id}`)
  return data
}
