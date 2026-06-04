import { apiClient } from '@/lib/api/client'
import type { AdminOverview } from '@/features/admin-home/types'

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data } = await apiClient.get<AdminOverview>('/admin/overview')
  return {
    today: data.today ?? '',
    orders_today: data.orders_today ?? 0,
    revenue_today: data.revenue_today ?? 0,
    orders_unpaid: data.orders_unpaid ?? 0,
    orders_awaiting_shipment: data.orders_awaiting_shipment ?? 0,
    recent_orders: Array.isArray(data.recent_orders) ? data.recent_orders : [],
  }
}
