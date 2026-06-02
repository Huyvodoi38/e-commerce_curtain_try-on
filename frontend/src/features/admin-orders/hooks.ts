import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmOrderPayment,
  fetchAdminOrders,
  updateOrderStatus,
} from '@/features/admin-orders/api'
import type {
  AdminOrdersQueryParams,
  OrderStatusUpdateBody,
} from '@/features/admin-orders/types'

export const adminOrdersQueryKey = (params: AdminOrdersQueryParams) =>
  ['admin-orders', params] as const

export function useAdminOrdersQuery(params: AdminOrdersQueryParams, enabled = true) {
  return useQuery({
    queryKey: adminOrdersQueryKey(params),
    queryFn: () => fetchAdminOrders(params),
    enabled,
    staleTime: 15_000,
  })
}

export function useConfirmOrderPaymentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => confirmOrderPayment(orderId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrderStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: OrderStatusUpdateBody }) =>
      updateOrderStatus(orderId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
