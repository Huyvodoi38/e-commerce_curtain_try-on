import type { CategoryDetail, CategoryPublic } from '@/features/categories/types'

export type CategoryManageItem = CategoryPublic & {
  is_active: boolean
  product_count: number
}

export type CategoryManageListResponse = {
  items: CategoryManageItem[]
  total: number
}

export type CategoryCreateBody = {
  name: string
  slug?: string
  description?: string | null
  is_featured?: boolean
  is_active?: boolean
  image_url?: string | null
}

export type CategoryPatchBody = {
  name?: string
  description?: string | null
  is_featured?: boolean
  is_active?: boolean
  image_url?: string | null
}

export type CategorySlugPatchBody = {
  slug: string
}

export type { CategoryDetail }
