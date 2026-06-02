import { apiClient } from '@/lib/api/client'
import type {
  AdminOrderDetail,
  AdminOrdersListResponse,
  AdminOrdersQueryParams,
  OrderStatusUpdateBody,
} from '@/features/admin-orders/types'

export async function fetchAdminOrders(
  params: AdminOrdersQueryParams = {},
): Promise<AdminOrdersListResponse> {
  const { data } = await apiClient.get<AdminOrdersListResponse>('/orders', { params })
  return data
}

export async function confirmOrderPayment(orderId: string): Promise<AdminOrderDetail> {
  const { data } = await apiClient.patch<AdminOrderDetail>(`/orders/${orderId}/payment/confirm`)
  return data
}

export async function updateOrderStatus(
  orderId: string,
  body: OrderStatusUpdateBody,
): Promise<AdminOrderDetail> {
  const { data } = await apiClient.patch<AdminOrderDetail>(`/orders/${orderId}/status`, body)
  return data
}
