import { PageShell } from '@/components/common/PageShell'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { usePatchUserMutation, useUsersQuery } from '@/features/users/hooks'
import { getErrorMessage } from '@/lib/api/client'

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const pageSize = 10
  const usersQuery = useUsersQuery({ role: 'customer', page, page_size: pageSize, search: search || undefined })
  const patchMutation = usePatchUserMutation()

  async function deactivateUser() {
    if (!deactivateId || !reason.trim()) return
    await patchMutation.mutateAsync({
      userId: deactivateId,
      body: { is_active: false, reason: reason.trim() },
    })
    setDeactivateId(null)
    setReason('')
  }

  return (
    <PageShell title="Khách hàng" description="Quản lý tài khoản customer, xem timeline hoạt động">
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, username, email"
          className="w-full max-w-md rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setPage(1)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          Lọc
        </button>
      </div>

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
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.items.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.username ?? user.email ?? '-'}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="text-success-700">Đang hoạt động</span>
                    ) : (
                      <span className="text-danger-700">Đã vô hiệu hóa</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/customers/${user.id}/logs`}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                      >
                        Xem timeline
                      </Link>
                      {user.is_active ? (
                        <button
                          type="button"
                          className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          onClick={() => setDeactivateId(user.id)}
                        >
                          Vô hiệu hóa
                        </button>
                      ) : null}
                    </div>
                  </td>
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

      {deactivateId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">Vô hiệu hóa tài khoản</h2>
            <p className="mt-1 text-sm text-foreground-muted">Lý do là bắt buộc cho thao tác này.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 min-h-24 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
              placeholder="Nhập lý do"
            />
            {patchMutation.isError ? (
              <p className="mt-2 text-sm text-danger-700">{getErrorMessage(patchMutation.error)}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeactivateId(null)
                  setReason('')
                }}
                className="rounded border border-border px-3 py-1.5 text-sm"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!reason.trim() || patchMutation.isPending}
                onClick={() => void deactivateUser()}
                className="rounded bg-danger-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {patchMutation.isPending ? 'Đang lưu…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
