import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useMeQuery } from '@/features/auth/hooks'
import {
  useCreateUserMutation,
  usePatchUserMutation,
  useUsersQuery,
} from '@/features/users/hooks'
import { formatDateTimeVi, formatUserLogin } from '@/features/users/userDisplay'
import { getErrorMessage } from '@/lib/api/client'
import { canManageStaff } from '@/lib/permissions/permissions'

type ConfirmAction =
  | { type: 'deactivate'; id: string; name: string }
  | { type: 'reactivate'; id: string; name: string }
  | { type: 'reset-password'; id: string; name: string }
  | null

const emptyCreateForm = {
  username: '',
  password: '',
  fullName: '',
}

export function StaffPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [reason, setReason] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFullName, setEditFullName] = useState('')

  const pageSize = 10

  const usersQuery = useUsersQuery({
    role: 'staff',
    page,
    page_size: pageSize,
    search: searchApplied || undefined,
  })

  const createMutation = useCreateUserMutation()
  const patchMutation = usePatchUserMutation()

  const totalPages = resolveTotalPages(usersQuery.data?.total ?? 0, pageSize)

  if (meQuery.data && !canManageStaff(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  function applySearch() {
    setSearchApplied(search.trim())
    setPage(1)
  }

  async function handleCreate() {
    if (!createForm.username.trim() || !createForm.password || !createForm.fullName.trim()) return
    await createMutation.mutateAsync({
      role: 'staff',
      username: createForm.username.trim().toLowerCase(),
      password: createForm.password,
      full_name: createForm.fullName.trim(),
    })
    setCreateForm(emptyCreateForm)
    setShowCreate(false)
  }

  async function saveEditName() {
    if (!editingId || !editFullName.trim()) return
    await patchMutation.mutateAsync({
      userId: editingId,
      body: { full_name: editFullName.trim() },
    })
    setEditingId(null)
    setEditFullName('')
  }

  async function submitConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === 'deactivate') {
      if (!reason.trim()) return
      await patchMutation.mutateAsync({
        userId: confirmAction.id,
        body: { is_active: false, reason: reason.trim() },
      })
    } else if (confirmAction.type === 'reactivate') {
      await patchMutation.mutateAsync({
        userId: confirmAction.id,
        body: { is_active: true },
      })
    } else {
      if (newPassword.length < 8) return
      await patchMutation.mutateAsync({
        userId: confirmAction.id,
        body: { password: newPassword },
      })
    }
    closeConfirm()
  }

  function closeConfirm() {
    setConfirmAction(null)
    setReason('')
    setNewPassword('')
  }

  const confirmPending = createMutation.isPending || patchMutation.isPending
  const confirmError = patchMutation.isError ? getErrorMessage(patchMutation.error) : null

  return (
    <PageShell title="Quản lý nhân viên">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Tìm theo tên, tên đăng nhập"
          className="w-full min-w-[200px] max-w-md rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={applySearch}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-muted"
        >
          Tìm
        </button>
        <button
          type="button"
          onClick={() => {
            if (showCreate) {
              setShowCreate(false)
              setCreateForm(emptyCreateForm)
            } else {
              setShowCreate(true)
            }
          }}
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand"
        >
          {showCreate ? 'Đóng form' : 'Thêm nhân viên'}
        </button>
      </div>

      {showCreate ? (
        <section className="mb-6 rounded-xl border border-border bg-surface-raised p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Tài khoản nhân viên mới</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Họ tên" htmlFor="staff-fullname">
              <input
                id="staff-fullname"
                value={createForm.fullName}
                onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Tên đăng nhập" htmlFor="staff-username">
              <input
                id="staff-username"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="vd. nhanvien01"
                className={inputClassName}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Mật khẩu (tối thiểu 8 ký tự)" htmlFor="staff-password">
              <input
                id="staff-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className={inputClassName}
                autoComplete="new-password"
              />
            </FormField>
          </div>
          {createMutation.isError ? (
            <p className="mt-2 text-sm text-danger-700">{getErrorMessage(createMutation.error)}</p>
          ) : null}
          <button
            type="button"
            disabled={
              createMutation.isPending ||
              !createForm.fullName.trim() ||
              !createForm.username.trim() ||
              createForm.password.length < 8
            }
            onClick={() => void handleCreate()}
            className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
          >
            {createMutation.isPending ? 'Đang tạo…' : 'Tạo nhân viên'}
          </button>
        </section>
      ) : null}

      {usersQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {usersQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(usersQuery.error)}
        </p>
      ) : null}

      {usersQuery.data ? (
        <>
          <p className="mb-3 text-sm text-foreground-subtle">
            Tìm thấy {usersQuery.data.total} nhân viên
          </p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-foreground-muted">
                <tr>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Tên đăng nhập</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-foreground-subtle">
                      Không có nhân viên phù hợp.
                    </td>
                  </tr>
                ) : (
                  usersQuery.data.items.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-border transition-colors hover:bg-surface-muted"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{user.full_name}</span>
                        <p className="mt-0.5 font-mono text-xs text-foreground-subtle">{user.id}</p>
                      </td>
                      <td className="px-4 py-3">{formatUserLogin(user.username, user.email)}</td>
                      <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">
                        {formatDateTimeVi(user.created_at)}
                      </td>
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
                            to={`/admin/staff/${user.id}/logs`}
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          >
                            Timeline
                          </Link>
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                            onClick={() => {
                              setEditingId(user.id)
                              setEditFullName(user.full_name)
                            }}
                          >
                            Sửa tên
                          </button>
                          {user.auth_provider === 'local' ? (
                            <button
                              type="button"
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'reset-password',
                                  id: user.id,
                                  name: user.full_name,
                                })
                              }
                            >
                              Đặt lại MK
                            </button>
                          ) : null}
                          {user.is_active ? (
                            <button
                              type="button"
                              className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'deactivate',
                                  id: user.id,
                                  name: user.full_name,
                                })
                              }
                            >
                              Vô hiệu hóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'reactivate',
                                  id: user.id,
                                  name: user.full_name,
                                })
                              }
                            >
                              Mở lại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {usersQuery.data && usersQuery.data.total > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang nhân viên"
        />
      ) : null}

      {editingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-raised p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Sửa họ tên</h2>
            <FormField label="Họ tên" htmlFor="edit-staff-name">
              <input
                id="edit-staff-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className={inputClassName}
              />
            </FormField>
            {patchMutation.isError ? (
              <p className="mt-2 text-sm text-danger-700">{getErrorMessage(patchMutation.error)}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setEditFullName('')
                }}
                className="rounded border border-border px-3 py-1.5 text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={patchMutation.isPending || !editFullName.trim()}
                onClick={() => void saveEditName()}
                className="rounded bg-brand px-3 py-1.5 text-sm text-on-brand disabled:opacity-50"
              >
                {patchMutation.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          title={
            confirmAction.type === 'deactivate'
              ? 'Vô hiệu hóa nhân viên'
              : confirmAction.type === 'reactivate'
                ? 'Mở lại tài khoản'
                : 'Đặt lại mật khẩu'
          }
          description={
            confirmAction.type === 'deactivate' ? (
              <>
                Vô hiệu hóa{' '}
                <span className="font-medium text-foreground">{confirmAction.name}</span>. Nhân viên
                không đăng nhập được cho đến khi mở lại. Lý do là bắt buộc.
              </>
            ) : confirmAction.type === 'reactivate' ? (
              <>
                Mở lại tài khoản{' '}
                <span className="font-medium text-foreground">{confirmAction.name}</span>?
              </>
            ) : (
              <>
                Đặt mật khẩu mới cho{' '}
                <span className="font-medium text-foreground">{confirmAction.name}</span> (tối thiểu 8
                ký tự).
              </>
            )
          }
          confirmLabel={
            confirmAction.type === 'deactivate'
              ? 'Vô hiệu hóa'
              : confirmAction.type === 'reactivate'
                ? 'Mở lại'
                : 'Đặt mật khẩu'
          }
          variant={confirmAction.type === 'deactivate' ? 'danger' : 'brand'}
          pending={confirmPending}
          confirmDisabled={
            confirmAction.type === 'deactivate'
              ? !reason.trim()
              : confirmAction.type === 'reset-password'
                ? newPassword.length < 8
                : false
          }
          error={confirmError}
          onConfirm={() => void submitConfirm()}
          onCancel={closeConfirm}
        >
          {confirmAction.type === 'deactivate' ? (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Nhập lý do vô hiệu hóa"
            />
          ) : null}
          {confirmAction.type === 'reset-password' ? (
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`mt-3 ${inputClassName}`}
              placeholder="Mật khẩu mới"
              autoComplete="new-password"
            />
          ) : null}
        </ConfirmDialog>
      ) : null}
    </PageShell>
  )
}
