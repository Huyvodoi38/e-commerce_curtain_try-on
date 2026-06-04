import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { useUserAuditLogsQuery, useUserDetailQuery } from '@/features/users/hooks'
import {
  activityActionLabel,
  formatDateTimeVi,
  formatLogDetailLines,
  formatUserLogin,
} from '@/features/users/userDisplay'
import { getErrorMessage } from '@/lib/api/client'

export function StaffLogsPage() {
  const { id = '' } = useParams()
  const [page, setPage] = useState(1)
  const pageSize = 5
  const userQuery = useUserDetailQuery(id, Boolean(id))
  const logsQuery = useUserAuditLogsQuery(id, page, pageSize, Boolean(id))
  const totalPages = resolveTotalPages(logsQuery.data?.total ?? 0, pageSize)

  return (
    <PageShell title="Timeline nhân viên">
      <Link to="/admin/staff" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Quay lại danh sách nhân viên
      </Link>

      {userQuery.data ? (
        <div className="mb-4 rounded-lg border border-border bg-surface-raised p-4 text-sm">
          <p className="font-semibold text-foreground">{userQuery.data.full_name}</p>
          <p className="text-foreground-muted">
            {formatUserLogin(userQuery.data.username, userQuery.data.email)}
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-subtle">
            Mã nhân viên: {userQuery.data.id}
          </p>
          <p className="mt-1 text-foreground-subtle">
            Tạo lúc {formatDateTimeVi(userQuery.data.created_at)} ·{' '}
            {userQuery.data.is_active ? (
              <span className="text-success-700">Đang hoạt động</span>
            ) : (
              <span className="text-danger-700">Đã vô hiệu hóa</span>
            )}
          </p>
        </div>
      ) : null}

      {logsQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {logsQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(logsQuery.error)}
        </p>
      ) : null}

      {logsQuery.data && logsQuery.data.items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-raised p-6 text-center text-sm text-foreground-subtle">
          Chưa có hoạt động ghi nhận.
        </p>
      ) : null}

      {logsQuery.data && logsQuery.data.items.length > 0 ? (
        <div className="space-y-3">
          {logsQuery.data.items.map((log) => (
            <article key={log.id} className="rounded-lg border border-border bg-surface-raised p-4 text-sm">
              <p className="font-medium text-foreground">{activityActionLabel(log.action)}</p>
              <p className="mt-1 text-foreground-muted">
                {formatDateTimeVi(log.created_at)} · {log.actor_name} ({log.actor_role})
              </p>
              <ul className="mt-2 space-y-0.5 font-mono text-xs text-foreground-subtle">
                {formatLogDetailLines(log, id).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}

      {logsQuery.data && logsQuery.data.total > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang nhật ký nhân viên"
        />
      ) : null}
    </PageShell>
  )
}
