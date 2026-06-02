import { apiClient } from '@/lib/api/client'
import type {
  MyOrdersQueryParams,
  OrderCreateBuyNowBody,
  OrderCreateFromCartBody,
  OrderCreateResponse,
  OrderDetail,
  OrderListResponse,
  VnpayPaymentInfo,
} from '@/features/orders/types'

export async function createOrderFromCart(
  body: OrderCreateFromCartBody,
): Promise<OrderCreateResponse> {
  const { data } = await apiClient.post<OrderCreateResponse>('/orders', body)
  return data
}

export async function createOrderBuyNow(
  body: OrderCreateBuyNowBody,
): Promise<OrderCreateResponse> {
  const { data } = await apiClient.post<OrderCreateResponse>('/orders/buy-now', body)
  return data
}

export async function fetchMyOrders(params: MyOrdersQueryParams = {}): Promise<OrderListResponse> {
  const { data } = await apiClient.get<OrderListResponse>('/orders', { params })
  return data
}

export async function fetchMyOrder(orderId: string): Promise<OrderDetail> {
  const { data } = await apiClient.get<OrderDetail>(`/orders/${orderId}`)
  return data
}

export async function cancelMyOrder(orderId: string): Promise<OrderDetail> {
  const { data } = await apiClient.patch<OrderDetail>(`/orders/${orderId}/cancel`)
  return data
}

export async function createVnpayPayment(orderId: string): Promise<VnpayPaymentInfo> {
  const { data } = await apiClient.post<VnpayPaymentInfo>(`/orders/${orderId}/payments/vnpay`)
  return data
}
