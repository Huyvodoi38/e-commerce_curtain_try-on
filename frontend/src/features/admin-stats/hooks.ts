import { useQuery } from '@tanstack/react-query'
import { fetchAdminStats } from '@/features/admin-stats/api'
import type { AdminStatsQueryParams } from '@/features/admin-stats/types'

export const adminStatsQueryKey = (params: AdminStatsQueryParams) =>
  ['admin-stats', params] as const

export function useAdminStatsQuery(params: AdminStatsQueryParams, enabled = true) {
  return useQuery({
    queryKey: adminStatsQueryKey(params),
    queryFn: () => fetchAdminStats(params),
    enabled,
    staleTime: 30_000,
  })
}
