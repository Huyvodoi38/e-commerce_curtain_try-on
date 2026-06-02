import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPromotion,
  deactivatePromotion,
  fetchPromotionDetail,
  fetchPromotions,
  patchPromotion,
  validatePromotionCode,
} from '@/features/promotions/api'
import type { PromotionCreateBody, PromotionPatchBody } from '@/features/promotions/types'

export const promotionsQueryKey = (params: {
  page: number
  page_size: number
  search?: string
  include_inactive?: boolean
}) => ['promotions', params] as const

export function usePromotionsQuery(params: {
  page: number
  page_size: number
  search?: string
  include_inactive?: boolean
}) {
  return useQuery({
    queryKey: promotionsQueryKey(params),
    queryFn: () => fetchPromotions(params),
  })
}

export function useCreatePromotionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PromotionCreateBody) => createPromotion(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

export function usePromotionDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: ['promotions', id],
    queryFn: () => fetchPromotionDetail(id),
    enabled: enabled && Boolean(id),
  })
}

export function usePatchPromotionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PromotionPatchBody }) => patchPromotion(id, body),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['promotions'] })
      void qc.invalidateQueries({ queryKey: ['promotions', vars.id] })
    },
  })
}

export function useDeactivatePromotionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivatePromotion(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

export function useValidatePromotionMutation() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      validatePromotionCode(code, subtotal),
  })
}
