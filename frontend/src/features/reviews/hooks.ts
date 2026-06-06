import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAdminReview,
  deleteAdminReview,
  deleteReview,
  fetchAdminReviews,
  fetchProductReviews,
  submitProductReview,
  updateReview,
} from '@/features/reviews/api'
import type { AdminReviewCreateBody, ReviewCreateBody, ReviewUpdateBody } from '@/features/reviews/types'

export const productReviewsQueryKey = (productId: string, page: number, pageSize: number) =>
  ['product-reviews', productId, page, pageSize] as const

export function useProductReviewsQuery(productId: string, page: number, pageSize = 10) {
  return useQuery({
    queryKey: productReviewsQueryKey(productId, page, pageSize),
    queryFn: () => fetchProductReviews(productId, { page, page_size: pageSize }),
    enabled: Boolean(productId),
  })
}

export function useSubmitProductReviewMutation(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReviewCreateBody) => submitProductReview(productId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product-reviews', productId] })
      void qc.invalidateQueries({ queryKey: ['products', 'detail', productId] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateReviewMutation(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, body }: { reviewId: string; body: ReviewUpdateBody }) =>
      updateReview(reviewId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product-reviews', productId] })
      void qc.invalidateQueries({ queryKey: ['products', 'detail', productId] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteReviewMutation(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product-reviews', productId] })
      void qc.invalidateQueries({ queryKey: ['products', 'detail', productId] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const adminReviewsQueryKey = (params: Record<string, unknown>) => ['admin-reviews', params] as const

export function useAdminReviewsQuery(params: {
  page: number
  page_size: number
  product_id?: string
  rating?: number
  source?: 'customer' | 'admin'
  search?: string
}) {
  return useQuery({
    queryKey: adminReviewsQueryKey(params),
    queryFn: () => fetchAdminReviews(params),
  })
}

export function useCreateAdminReviewMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AdminReviewCreateBody) => createAdminReview(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteAdminReviewMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteAdminReview(reviewId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
