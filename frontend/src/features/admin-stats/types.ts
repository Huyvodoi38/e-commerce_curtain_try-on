import type { OrderStatus } from '@/features/orders/types'

export type OrderStatusCount = {
  status: OrderStatus
  count: number
}

export type OrderDayStat = {
  date: string
  order_count: number
  revenue: number
}

export type AdminStats = {
  from_date: string | null
  to_date: string | null
  orders_total: number
  revenue_total: number
  by_status: OrderStatusCount[]
  by_day: OrderDayStat[]
  payment_unpaid: number
  payment_paid: number
  payment_offline: number | null
  payment_vnpay: number | null
  customers_new: number | null
  products_low_stock: number | null
}

export type AdminStatsQueryParams = {
  from?: string
  to?: string
}
