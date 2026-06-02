import { PageShell } from '@/components/common/PageShell'
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
  const pageSize = 20
  const logsQuery = useSystemAuditLogsQuery({
    page,
    page_size: pageSize,
    customer_id: customerId || undefined,
    order_id: orderId || undefined,
  })

  if (meQuery.data && !canViewSystemAuditLogs(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <PageShell title="Nhật ký hệ thống" description="Manager only — theo dõi tất cả activity logs">
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
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
              <p className="mt-1 text-foreground-subtle">
                customer={log.customer_id ?? '-'} · order={log.order_id ?? '-'}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {logsQuery.data && logsQuery.data.total > pageSize ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Trước
          </button>
          <span>Trang {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={logsQuery.data.items.length < pageSize}
            className="rounded border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      ) : null}
    </PageShell>
  )
}
