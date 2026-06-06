import { apiClient } from '@/lib/api/client'
import type {
  AdminReviewCreateBody,
  AdminReviewListResponse,
  AdminReviewPublic,
  ReviewCreateBody,
  ReviewListResponse,
  ReviewPublic,
  ReviewUpdateBody,
} from '@/features/reviews/types'

export async function fetchProductReviews(
  productId: string,
  params: { page?: number; page_size?: number },
): Promise<ReviewListResponse> {
  const { data } = await apiClient.get<ReviewListResponse>(`/products/${productId}/reviews`, { params })
  return data
}

export async function submitProductReview(
  productId: string,
  body: ReviewCreateBody,
): Promise<ReviewPublic> {
  const { data } = await apiClient.post<ReviewPublic>(`/products/${productId}/reviews`, body)
  return data
}

export async function updateReview(reviewId: string, body: ReviewUpdateBody): Promise<ReviewPublic> {
  const { data } = await apiClient.patch<ReviewPublic>(`/reviews/${reviewId}`, body)
  return data
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}`)
}

export async function fetchAdminReviews(params: {
  page?: number
  page_size?: number
  product_id?: string
  rating?: number
  source?: 'customer' | 'admin'
  search?: string
}): Promise<AdminReviewListResponse> {
  const { data } = await apiClient.get<AdminReviewListResponse>('/admin/reviews', { params })
  return data
}

export async function createAdminReview(body: AdminReviewCreateBody): Promise<AdminReviewPublic> {
  const { data } = await apiClient.post<AdminReviewPublic>('/admin/reviews', body)
  return data
}

export async function deleteAdminReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/admin/reviews/${reviewId}`)
}
