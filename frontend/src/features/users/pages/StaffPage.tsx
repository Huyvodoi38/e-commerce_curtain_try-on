import { PageShell } from '@/components/common/PageShell'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'
import { useUsersQuery } from '@/features/users/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { canManageStaff } from '@/lib/permissions/permissions'

export function StaffPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const pageSize = 10
  const usersQuery = useUsersQuery({ role: 'staff', page, page_size: pageSize })

  if (meQuery.data && !canManageStaff(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <PageShell title="Nhân viên" description="Manager only — danh sách tài khoản staff">
      {usersQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {usersQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(usersQuery.error)}
        </p>
      ) : null}
      {usersQuery.data ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Đăng nhập</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.items.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.username ?? user.email ?? '-'}</td>
                  <td className="px-4 py-3">{user.is_active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {usersQuery.data && usersQuery.data.total > pageSize ? (
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
            disabled={usersQuery.data.items.length < pageSize}
            className="rounded border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      ) : null}
    </PageShell>
  )
}
