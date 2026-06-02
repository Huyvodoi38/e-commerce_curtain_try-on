import type { ActivityAction, ActivityLogListResponse } from '@/features/users/types'

export type SystemAuditLogsQueryParams = {
  page?: number
  page_size?: number
  customer_id?: string
  order_id?: string
  actor_id?: string
  action?: ActivityAction
  from?: string
  to?: string
}

export type SystemAuditLogsResponse = ActivityLogListResponse
