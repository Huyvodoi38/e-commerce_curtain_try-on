import { useQuery } from '@tanstack/react-query'
import { fetchSystemAuditLogs } from '@/features/audit-logs/api'
import type { SystemAuditLogsQueryParams } from '@/features/audit-logs/types'

export const systemAuditLogsQueryKey = (params: SystemAuditLogsQueryParams) =>
  ['system-audit-logs', params] as const

export function useSystemAuditLogsQuery(params: SystemAuditLogsQueryParams, enabled = true) {
  return useQuery({
    queryKey: systemAuditLogsQueryKey(params),
    queryFn: () => fetchSystemAuditLogs(params),
    enabled,
    staleTime: 10_000,
  })
}
