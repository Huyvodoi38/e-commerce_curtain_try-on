import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import {
  resolveCustomerLogsBack,
  type CustomerLogsNavState,
} from '@/features/users/customerLogsNav'
import { useUserAuditLogsQuery, useUserDetailQuery } from '@/features/users/hooks'
import { getErrorMessage } from '@/lib/api/client'

export function CustomerLogsPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const back = resolveCustomerLogsBack(location.state as CustomerLogsNavState | null, searchParams)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const userQuery = useUserDetailQuery(id, Boolean(id))
  const logsQuery = useUserAuditLogsQuery(id, page, pageSize, Boolean(id))
  const totalPages = resolveTotalPages(logsQuery.data?.total ?? 0, pageSize)

  return (
    <PageShell title="Timeline khách hàng">
      <Link to={back.to} className="mb-4 inline-block text-sm text-brand hover:underline">
        ← {back.label}
      </Link>

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

      {logsQuery.data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang nhật ký khách hàng"
        />
      ) : null}
    </PageShell>
  )
}
