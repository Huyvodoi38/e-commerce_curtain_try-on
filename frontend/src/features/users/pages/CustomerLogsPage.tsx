import { PageShell } from '@/components/common/PageShell'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useUserAuditLogsQuery, useUserDetailQuery } from '@/features/users/hooks'
import { getErrorMessage } from '@/lib/api/client'

export function CustomerLogsPage() {
  const { id = '' } = useParams()
  const [page, setPage] = useState(1)
  const pageSize = 20
  const userQuery = useUserDetailQuery(id, Boolean(id))
  const logsQuery = useUserAuditLogsQuery(id, page, pageSize, Boolean(id))

  return (
    <PageShell title="Timeline khách hàng" description="Lịch sử hành động liên quan tới tài khoản">
      {userQuery.data ? (
        <div className="mb-4 rounded-lg border border-border bg-surface-raised p-4 text-sm">
          <p className="font-semibold">{userQuery.data.full_name}</p>
          <p className="text-foreground-muted">{userQuery.data.username ?? userQuery.data.email ?? '-'}</p>
        </div>
      ) : null}

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
              <p className="font-medium text-foreground">{log.action}</p>
              <p className="mt-1 text-foreground-muted">
                {new Date(log.created_at).toLocaleString('vi-VN')} · {log.actor_name} ({log.actor_role})
              </p>
              {log.order_id ? <p className="mt-1 text-foreground-subtle">Order: {log.order_id}</p> : null}
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
