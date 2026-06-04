import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  deactivateCategory,
  fetchAdminCategories,
  patchCategory,
  patchCategorySlug,
} from '@/features/admin-categories/api'
import type { CategoryCreateBody, CategoryPatchBody } from '@/features/admin-categories/types'

export const adminCategoriesQueryKey = (includeInactive: boolean) =>
  ['admin-categories', { includeInactive }] as const

export function useAdminCategoriesQuery(includeInactive = false) {
  return useQuery({
    queryKey: adminCategoriesQueryKey(includeInactive),
    queryFn: () => fetchAdminCategories(includeInactive),
  })
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoryCreateBody) => createCategory(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function usePatchCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryPatchBody }) => patchCategory(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function usePatchCategorySlugMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, slug }: { id: string; slug: string }) =>
      patchCategorySlug(id, { slug }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeactivateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
