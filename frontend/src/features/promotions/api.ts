import { apiClient } from '@/lib/api/client'
import type {
  PromotionCreateBody,
  PromotionDetail,
  PromotionListResponse,
  PromotionPatchBody,
  PromotionValidateResponse,
} from '@/features/promotions/types'

export async function fetchPromotions(params: {
  page?: number
  page_size?: number
  search?: string
  include_inactive?: boolean
}): Promise<PromotionListResponse> {
  const { data } = await apiClient.get<PromotionListResponse>('/promotions', { params })
  return data
}

export async function createPromotion(body: PromotionCreateBody): Promise<PromotionDetail> {
  const { data } = await apiClient.post<PromotionDetail>('/promotions', body)
  return data
}

export async function fetchPromotionDetail(id: string): Promise<PromotionDetail> {
  const { data } = await apiClient.get<PromotionDetail>(`/promotions/${id}`)
  return data
}

export async function patchPromotion(id: string, body: PromotionPatchBody): Promise<PromotionDetail> {
  const { data } = await apiClient.patch<PromotionDetail>(`/promotions/${id}`, body)
  return data
}

export async function deactivatePromotion(id: string): Promise<PromotionDetail> {
  const { data } = await apiClient.delete<PromotionDetail>(`/promotions/${id}`)
  return data
}

export async function validatePromotionCode(
  code: string,
  subtotal: number,
): Promise<PromotionValidateResponse> {
  const { data } = await apiClient.post<PromotionValidateResponse>('/promotions/validate', {
    code,
    subtotal,
  })
  return data
}
