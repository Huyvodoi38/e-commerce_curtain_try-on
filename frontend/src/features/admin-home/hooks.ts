import { useQuery } from '@tanstack/react-query'
import { fetchAdminOverview } from '@/features/admin-home/api'

export const adminOverviewQueryKey = ['admin-overview'] as const

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: adminOverviewQueryKey,
    queryFn: fetchAdminOverview,
    staleTime: 30_000,
  })
}
