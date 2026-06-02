import { apiClient } from '@/lib/api/client'
import type {
  SystemAuditLogsQueryParams,
  SystemAuditLogsResponse,
} from '@/features/audit-logs/types'

export async function fetchSystemAuditLogs(
  params: SystemAuditLogsQueryParams = {},
): Promise<SystemAuditLogsResponse> {
  const { data } = await apiClient.get<SystemAuditLogsResponse>('/audit-logs', { params })
  return data
}
