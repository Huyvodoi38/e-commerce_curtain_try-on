import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { usePatchUserMutation, useUsersQuery } from '@/features/users/hooks'
import { getErrorMessage } from '@/lib/api/client'

type ConfirmAction =
  | { type: 'deactivate'; id: string; name: string }
  | { type: 'reactivate'; id: string; name: string }
  | null

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [reason, setReason] = useState('')
  const pageSize = 10
  const usersQuery = useUsersQuery({ role: 'customer', page, page_size: pageSize, search: search || undefined })
  const patchMutation = usePatchUserMutation()
  const totalPages = resolveTotalPages(usersQuery.data?.total ?? 0, pageSize)

  async function submitConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === 'deactivate') {
      if (!reason.trim()) return
      await patchMutation.mutateAsync({
        userId: confirmAction.id,
        body: { is_active: false, reason: reason.trim() },
      })
    } else {
      await patchMutation.mutateAsync({
        userId: confirmAction.id,
        body: { is_active: true },
      })
    }
    setConfirmAction(null)
    setReason('')
  }

  function closeConfirm() {
    setConfirmAction(null)
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
                <tr
                  key={user.id}
                  className="border-t border-border transition-colors hover:bg-surface-muted"
                >
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
                          onClick={() =>
                            setConfirmAction({ type: 'deactivate', id: user.id, name: user.full_name })
                          }
                        >
                          Vô hiệu hóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          onClick={() =>
                            setConfirmAction({ type: 'reactivate', id: user.id, name: user.full_name })
                          }
                        >
                          Mở lại
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {usersQuery.data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang khách hàng"
        />
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">
              {confirmAction.type === 'deactivate' ? 'Vô hiệu hóa tài khoản' : 'Mở lại tài khoản'}
            </h2>
            {confirmAction.type === 'deactivate' ? (
              <>
                <p className="mt-1 text-sm text-foreground-muted">
                  Vô hiệu hóa{' '}
                  <span className="font-medium text-foreground">{confirmAction.name}</span>. Lý do là bắt
                  buộc.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-3 min-h-24 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
                  placeholder="Nhập lý do"
                />
              </>
            ) : (
              <p className="mt-2 text-sm text-foreground-muted">
                Khách hàng{' '}
                <span className="font-medium text-foreground">{confirmAction.name}</span> sẽ đăng nhập lại
                được sau khi mở tài khoản.
              </p>
            )}
            {patchMutation.isError ? (
              <p className="mt-2 text-sm text-danger-700">{getErrorMessage(patchMutation.error)}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded border border-border px-3 py-1.5 text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={
                  patchMutation.isPending ||
                  (confirmAction.type === 'deactivate' && !reason.trim())
                }
                onClick={() => void submitConfirm()}
                className={`rounded px-3 py-1.5 text-sm text-white disabled:opacity-50 ${
                  confirmAction.type === 'deactivate' ? 'bg-danger-700' : 'bg-brand'
                }`}
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
