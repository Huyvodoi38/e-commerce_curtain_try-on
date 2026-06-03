import { apiClient } from '@/lib/api/client'

export type ProductPublic = {
  id: string
  name: string
  description: string | null
  price: number
  sale_price: number | null
  effective_price: number
  is_on_sale: boolean
  stock: number
  categories: string[]
  image_urls: string[]
  display_image_url: string | null
  ai_texture_url: string | null
  is_active?: boolean
}

export type ProductListResponse = {
  items: ProductPublic[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type ProductsQueryParams = {
  page?: number
  page_size?: number
  search?: string
  category?: string
  in_stock_only?: boolean
}

export async function fetchProducts(params: ProductsQueryParams): Promise<ProductListResponse> {
  const { data } = await apiClient.get<ProductListResponse>('/products', { params })
  return data
}

export async function fetchProductDetail(id: string): Promise<ProductPublic> {
  const { data } = await apiClient.get<ProductPublic>(`/products/${id}`)
  return data
}
