import { apiClient } from '@/lib/api/client'
import type { AdminStats, AdminStatsQueryParams } from '@/features/admin-stats/types'

export async function fetchAdminStats(params: AdminStatsQueryParams = {}): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats', { params })
  return {
    ...data,
    by_status: Array.isArray(data.by_status) ? data.by_status : [],
    by_day: Array.isArray(data.by_day) ? data.by_day : [],
  }
}
