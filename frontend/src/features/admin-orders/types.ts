import type { OrderDetail, OrderListResponse, OrderStatus } from '@/features/orders/types'

export type AdminOrdersQueryParams = {
  page?: number
  page_size?: number
  status?: OrderStatus
  user_id?: string
}

export type OrderStatusUpdateBody = {
  status: OrderStatus
  reason?: string
}

export type AdminOrdersListResponse = OrderListResponse
export type AdminOrderDetail = OrderDetail
