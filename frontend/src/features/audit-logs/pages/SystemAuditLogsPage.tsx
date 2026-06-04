import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'
import { useSystemAuditLogsQuery } from '@/features/audit-logs/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { canViewSystemAuditLogs } from '@/lib/permissions/permissions'

export function SystemAuditLogsPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [customerId, setCustomerId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [staffId, setStaffId] = useState('')
  const pageSize = 5
  const logsQuery = useSystemAuditLogsQuery({
    page,
    page_size: pageSize,
    customer_id: customerId || undefined,
    order_id: orderId || undefined,
    actor_id: staffId || undefined,
  })
  const totalPages = resolveTotalPages(logsQuery.data?.total ?? 0, pageSize)

  if (meQuery.data && !canViewSystemAuditLogs(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <PageShell title="Nhật ký hệ thống">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="Lọc theo customer_id"
          className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Lọc theo order_id"
          className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        <input
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          placeholder="Lọc theo mã nhân viên (actor_id)"
          className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
      </div>

      {logsQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {logsQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(logsQuery.error)}
        </p>
      ) : null}

      {logsQuery.data ? (
        <div className="space-y-3">
          {logsQuery.data.items.map((log) => (
            <article key={log.id} className="rounded-lg border border-border bg-surface-raised p-4 text-sm">
              <p className="font-medium">{log.action}</p>
              <p className="mt-1 text-foreground-muted">
                {new Date(log.created_at).toLocaleString('vi-VN')} · {log.actor_name} ({log.actor_role})
              </p>
              <p className="mt-1 font-mono text-xs text-foreground-subtle">
                log={log.id}
                {typeof log.metadata.staff_id === 'string'
                  ? ` · staff=${log.metadata.staff_id}`
                  : ''}
                {' · actor='}
                {log.actor_id} · customer={log.customer_id ?? '-'} · order={log.order_id ?? '-'}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {logsQuery.data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang nhật ký hệ thống"
        />
      ) : null}
    </PageShell>
  )
}
