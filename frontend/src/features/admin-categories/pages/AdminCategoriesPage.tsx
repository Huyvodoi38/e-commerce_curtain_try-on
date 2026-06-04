import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useMeQuery } from '@/features/auth/hooks'
import { fetchCategoryDetailBySlug } from '@/features/admin-categories/api'
import {
  useAdminCategoriesQuery,
  useCreateCategoryMutation,
  useDeactivateCategoryMutation,
  usePatchCategoryMutation,
} from '@/features/admin-categories/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { FEATURED_MENU_LIMIT } from '@/lib/catalog/categories'
import {
  canManageCategories,
  canViewAdminCategories,
  isManager,
} from '@/lib/permissions/permissions'

const emptyForm = {
  name: '',
  description: '',
  isFeatured: false,
  isActive: true,
  imageUrl: '',
}

type ConfirmAction =
  | { type: 'create' }
  | { type: 'update' }
  | { type: 'hide'; id: string; name: string }
  | { type: 'restore'; id: string; name: string }
  | { type: 'feature'; id: string; name: string; next: boolean }
  | null

export function AdminCategoriesPage() {
  const meQuery = useMeQuery()
  const role = meQuery.data?.role ?? 'customer'
  const manager = isManager(role)
  const includeInactive = manager

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [featuredPendingId, setFeaturedPendingId] = useState<string | null>(null)

  const categoriesQuery = useAdminCategoriesQuery(includeInactive)
  const createMutation = useCreateCategoryMutation()
  const patchMutation = usePatchCategoryMutation()
  const deactivateMutation = useDeactivateCategoryMutation()

  const filteredItems = useMemo(() => {
    if (!categoriesQuery.data) return []
    const q = search.trim().toLowerCase()
    if (!q) return categoriesQuery.data.items
    return categoriesQuery.data.items.filter((c) => c.name.toLowerCase().includes(q))
  }, [categoriesQuery.data, search])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function openEdit(id: string, slug: string) {
    setShowCreate(false)
    setEditingId(id)
    try {
      const detail = await fetchCategoryDetailBySlug(slug)
      setForm({
        name: detail.name,
        description: detail.description ?? '',
        isFeatured: detail.is_featured,
        isActive: detail.is_active,
        imageUrl: detail.image_url ?? '',
      })
    } catch {
      resetForm()
    }
  }

  async function handleCreate() {
    const name = form.name.trim()
    if (!name) return
    await createMutation.mutateAsync({
      name,
      description: form.description.trim() || null,
      is_featured: form.isFeatured,
      is_active: true,
      image_url: form.imageUrl.trim() || null,
    })
    setShowCreate(false)
    resetForm()
  }

  async function handleUpdate() {
    if (!editingId || !form.name.trim()) return
    await patchMutation.mutateAsync({
      id: editingId,
      body: {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_featured: form.isFeatured,
        is_active: form.isActive,
        image_url: form.imageUrl.trim() || null,
      },
    })
    resetForm()
  }

  async function handleToggleFeatured(item: { id: string; name: string }, next: boolean) {
    setFeaturedPendingId(item.id)
    try {
      await patchMutation.mutateAsync({
        id: item.id,
        body: { is_featured: next },
      })
    } finally {
      setFeaturedPendingId(null)
    }
  }

  async function submitConfirm() {
    if (!confirmAction) return
    try {
      if (confirmAction.type === 'create') {
        await handleCreate()
      } else if (confirmAction.type === 'update') {
        await handleUpdate()
      } else if (confirmAction.type === 'hide') {
        await deactivateMutation.mutateAsync(confirmAction.id)
      } else if (confirmAction.type === 'restore') {
        await patchMutation.mutateAsync({
          id: confirmAction.id,
          body: { is_active: true },
        })
      } else if (confirmAction.type === 'feature') {
        await handleToggleFeatured(
          { id: confirmAction.id, name: confirmAction.name },
          confirmAction.next,
        )
      }
      setConfirmAction(null)
    } catch {
      // lỗi hiển thị bên dưới
    }
  }

  const confirmPending =
    createMutation.isPending ||
    patchMutation.isPending ||
    deactivateMutation.isPending ||
    featuredPendingId !== null

  const formPending = createMutation.isPending || patchMutation.isPending

  if (meQuery.data && !canViewAdminCategories(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  const showForm = showCreate || editingId

  return (
    <PageShell title="Quản lý danh mục">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên danh mục"
          className="w-full max-w-md rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        {canManageCategories(role) ? (
          <button
            type="button"
            onClick={() => {
              if (showCreate) {
                setShowCreate(false)
                resetForm()
              } else {
                setShowCreate(true)
                setEditingId(null)
                setForm(emptyForm)
              }
            }}
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand"
          >
            {showCreate ? 'Đóng form' : 'Thêm danh mục'}
          </button>
        ) : null}
      </div>

      {showForm && canManageCategories(role) ? (
        <section className="mb-4 rounded-xl border border-border bg-surface-raised p-4">
          <h2 className="text-base font-semibold">
            {editingId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <FormField label="Tên danh mục" htmlFor="cat-name">
              <input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClassName}
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Mô tả (tuỳ chọn)" htmlFor="cat-desc">
                <textarea
                  id="cat-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="URL ảnh (tuỳ chọn)" htmlFor="cat-image">
              <input
                id="cat-image"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className={inputClassName}
              />
            </FormField>

            <div className="flex flex-col gap-2 pt-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                  className="rounded border-border"
                />
                Hiển thị trên menu nổi bật cửa hàng
              </label>
              <p className="text-xs text-foreground-subtle">
                Tối đa {FEATURED_MENU_LIMIT} danh mục đang hoạt động; sắp xếp theo tên trên menu.
              </p>
              {editingId ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-border"
                  />
                  Đang hoạt động (hiển thị cửa hàng)
                </label>
              ) : null}
            </div>
          </div>

          {createMutation.isError || patchMutation.isError ? (
            <p className="mt-2 text-sm text-danger-700">
              {getErrorMessage(createMutation.error ?? patchMutation.error)}
            </p>
          ) : null}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction({ type: editingId ? 'update' : 'create' })}
              disabled={formPending || !form.name.trim()}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
            >
              {editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Hủy sửa
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {categoriesQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {categoriesQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(categoriesQuery.error)}
        </p>
      ) : null}

      {deactivateMutation.isError ? (
        <p className="mb-4 rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(deactivateMutation.error)}
        </p>
      ) : null}

      {categoriesQuery.data ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Nổi bật</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-border transition-colors hover:bg-surface-muted"
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    {item.is_active && canManageCategories(role) ? (
                      <input
                        type="checkbox"
                        checked={item.is_featured}
                        disabled={featuredPendingId === item.id}
                        title="Hiển thị trên menu nổi bật cửa hàng"
                        onChange={(e) =>
                          setConfirmAction({
                            type: 'feature',
                            id: item.id,
                            name: item.name,
                            next: e.target.checked,
                          })
                        }
                        className="rounded border-border"
                      />
                    ) : item.is_featured ? (
                      <span className="text-xs text-brand">Có</span>
                    ) : (
                      <span className="text-foreground-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{item.product_count}</td>
                  <td className="px-4 py-3">
                    {item.is_active ? (
                      <span className="text-success-700">Đang hiển thị</span>
                    ) : (
                      <span className="text-danger-700">Đã ẩn</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManageCategories(role) ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openEdit(item.id, item.slug)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                        >
                          Sửa
                        </button>
                        {item.is_active ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ type: 'hide', id: item.id, name: item.name })
                            }
                            className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                            disabled={item.product_count > 0}
                            title={
                              item.product_count > 0
                                ? 'Gỡ sản phẩm khỏi danh mục trước khi ẩn'
                                : undefined
                            }
                          >
                            Ẩn
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ type: 'restore', id: item.id, name: item.name })
                            }
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          >
                            Bật lại
                          </button>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-foreground-subtle">Không có danh mục phù hợp.</p>
          ) : null}
        </div>
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          title={
            confirmAction.type === 'create'
              ? 'Tạo danh mục mới'
              : confirmAction.type === 'update'
                ? 'Lưu thay đổi danh mục'
                : confirmAction.type === 'hide'
                  ? 'Ẩn danh mục'
                  : confirmAction.type === 'restore'
                    ? 'Bật lại danh mục'
                    : confirmAction.type === 'feature' && confirmAction.next
                      ? 'Thêm vào menu nổi bật'
                      : 'Bỏ khỏi menu nổi bật'
          }
          description={
            confirmAction.type === 'create' ? (
              <>
                Tạo danh mục{' '}
                <span className="font-medium text-foreground">{form.name.trim()}</span> trên cửa
                hàng?
              </>
            ) : confirmAction.type === 'update' ? (
              <>
                Lưu thay đổi cho danh mục{' '}
                <span className="font-medium text-foreground">{form.name.trim()}</span>?
              </>
            ) : confirmAction.type === 'hide' ? (
              <>
                Ẩn <span className="font-medium text-foreground">{confirmAction.name}</span> khỏi
                cửa hàng. Chỉ ẩn được khi không còn sản phẩm trong danh mục này.
              </>
            ) : confirmAction.type === 'restore' ? (
              <>
                Hiển thị lại{' '}
                <span className="font-medium text-foreground">{confirmAction.name}</span> trên cửa
                hàng?
              </>
            ) : confirmAction.type === 'feature' && confirmAction.next ? (
              <>
                Hiển thị <span className="font-medium text-foreground">{confirmAction.name}</span>{' '}
                trên menu nổi bật cửa hàng?
              </>
            ) : confirmAction.type === 'feature' ? (
              <>
                Bỏ <span className="font-medium text-foreground">{confirmAction.name}</span> khỏi
                menu nổi bật?
              </>
            ) : null
          }
          confirmLabel={
            confirmAction.type === 'create'
              ? 'Tạo danh mục'
              : confirmAction.type === 'update'
                ? 'Lưu thay đổi'
                : confirmAction.type === 'hide'
                  ? 'Ẩn danh mục'
                  : confirmAction.type === 'restore'
                    ? 'Bật lại'
                    : 'Xác nhận'
          }
          variant={confirmAction.type === 'hide' ? 'danger' : 'brand'}
          pending={confirmPending}
          error={
            createMutation.isError || patchMutation.isError || deactivateMutation.isError
              ? getErrorMessage(
                  createMutation.error ?? patchMutation.error ?? deactivateMutation.error,
                )
              : null
          }
          onConfirm={() => void submitConfirm()}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </PageShell>
  )
}
