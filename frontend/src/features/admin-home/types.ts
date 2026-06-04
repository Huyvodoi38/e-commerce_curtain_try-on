import type { OrderSummary } from '@/features/orders/types'

export type AdminOverview = {
  today: string
  orders_today: number
  revenue_today: number
  orders_unpaid: number
  orders_awaiting_shipment: number
  recent_orders: OrderSummary[]
}
