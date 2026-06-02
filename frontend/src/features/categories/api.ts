import { apiClient } from '@/lib/api/client'
import type { CategoryDetail, CategoryListResponse, CategoryTreeNode } from './types'

export async function fetchCategoryBySlug(slug: string): Promise<CategoryDetail> {
  const { data } = await apiClient.get<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`)
  return data
}

export async function fetchCategories(featuredOnly = false): Promise<CategoryListResponse> {
  const { data } = await apiClient.get<CategoryListResponse>('/categories', {
    params: featuredOnly ? { featured_only: true } : undefined,
  })
  return data
}

export async function fetchCategoriesTree(): Promise<CategoryTreeNode[]> {
  const { data } = await apiClient.get<CategoryTreeNode[]>('/categories/tree')
  return data
}
