export type AdminProduct = {
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
  is_active: boolean
}

export type AdminProductDetail = AdminProduct & {
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AdminProductListResponse = {
  items: AdminProduct[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type ProductCreateBody = {
  name: string
  description?: string | null
  price: number
  sale_price?: number | null
  stock: number
  categories?: string[]
  image_urls?: string[]
  display_image_url?: string | null
  ai_texture_url?: string | null
  attributes?: Record<string, unknown>
  is_active?: boolean
}

export type ProductPatchBody = {
  name?: string
  description?: string | null
  price?: number
  sale_price?: number | null
  stock?: number
  categories?: string[]
  image_urls?: string[]
  display_image_url?: string | null
  ai_texture_url?: string | null
  attributes?: Record<string, unknown>
  is_active?: boolean
}

export type ProductStockPatchBody = {
  stock: number
}
