import { apiClient } from '@/lib/api/client'
import type { CategoryDetail } from '@/features/categories/types'
import type {
  CategoryCreateBody,
  CategoryManageListResponse,
  CategoryPatchBody,
  CategorySlugPatchBody,
} from '@/features/admin-categories/types'

export async function fetchAdminCategories(
  includeInactive = false,
): Promise<CategoryManageListResponse> {
  const { data } = await apiClient.get<CategoryManageListResponse>('/categories/manage', {
    params: includeInactive ? { include_inactive: true } : undefined,
  })
  return data
}

export async function fetchCategoryDetailBySlug(slug: string): Promise<CategoryDetail> {
  const { data } = await apiClient.get<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`)
  return data
}

export async function createCategory(body: CategoryCreateBody): Promise<CategoryDetail> {
  const { data } = await apiClient.post<CategoryDetail>('/categories', body)
  return data
}

export async function patchCategory(id: string, body: CategoryPatchBody): Promise<CategoryDetail> {
  const { data } = await apiClient.patch<CategoryDetail>(`/categories/${id}`, body)
  return data
}

export async function patchCategorySlug(
  id: string,
  body: CategorySlugPatchBody,
): Promise<CategoryDetail> {
  const { data } = await apiClient.patch<CategoryDetail>(`/categories/${id}/slug`, body)
  return data
}

export async function deactivateCategory(id: string): Promise<CategoryDetail> {
  const { data } = await apiClient.delete<CategoryDetail>(`/categories/${id}`)
  return data
}
