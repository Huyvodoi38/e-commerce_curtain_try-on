import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmOrderPayment,
  deleteOrderPermanent,
  fetchAdminOrderDetail,
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

export const adminOrderDetailQueryKey = (id: string) => ['admin-orders', id] as const

export function useAdminOrderDetailQuery(orderId: string, enabled = true) {
  return useQuery({
    queryKey: adminOrderDetailQueryKey(orderId),
    queryFn: () => fetchAdminOrderDetail(orderId),
    enabled: enabled && Boolean(orderId),
  })
}

export function useConfirmOrderPaymentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => confirmOrderPayment(orderId),
    onSuccess: (_, orderId) => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      void qc.invalidateQueries({ queryKey: adminOrderDetailQueryKey(orderId) })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrderStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: OrderStatusUpdateBody }) =>
      updateOrderStatus(orderId, body),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      void qc.invalidateQueries({ queryKey: adminOrderDetailQueryKey(vars.orderId) })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useDeleteOrderPermanentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => deleteOrderPermanent(orderId),
    onSuccess: (_, orderId) => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] })
      void qc.removeQueries({ queryKey: adminOrderDetailQueryKey(orderId) })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
