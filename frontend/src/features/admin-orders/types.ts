import type {
  OrderDetail,
  OrderListResponse,
  OrderStatus,
  PaymentStatus,
} from '@/features/orders/types'

export type AdminOrdersQueryParams = {
  page?: number
  page_size?: number
  status?: OrderStatus
  payment_status?: PaymentStatus
  user_id?: string
  search?: string
  /** Ngày tạo đơn (YYYY-MM-DD), theo giờ Việt Nam */
  from?: string
  to?: string
}

export type OrderStatusUpdateBody = {
  status: OrderStatus
  reason?: string
}

export type AdminOrdersListResponse = OrderListResponse
export type AdminOrderDetail = OrderDetail
