import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useMeQuery } from '@/features/auth/hooks'
import { fetchAdminProductDetail } from '@/features/admin-products/api'
import {
  useAdminProductsQuery,
  useCreateProductMutation,
  useDeactivateProductMutation,
  useDeleteProductPermanentMutation,
  usePatchProductMutation,
  usePatchProductStockMutation,
} from '@/features/admin-products/hooks'
import { useCategoriesQuery } from '@/features/categories/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { ProductAttributesField, type ProductAttributeRow } from '@/features/admin-products/components/ProductAttributesField'
import { ProductImagesField } from '@/features/admin-products/components/ProductImagesField'
import {
  attributesToRecord,
  recordToAttributeRows,
} from '@/lib/ai/promptResolver'
import {
  resolveDraftItemsToUrls,
  revokeProductImageDrafts,
  savedUrlsToDraftItems,
  type ProductImageDraftItem,
} from '@/features/admin-products/productImageDraft'
import { productPrimaryImageUrl } from '@/lib/products/images'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'
import {
  canManageProducts,
  canPatchProductStock,
  canViewAdminProducts,
  isManager,
} from '@/lib/permissions/permissions'
import { formatVnd } from '@/lib/utils/formatCurrency'

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  salePrice: '' as number | '',
  stock: 0,
  categories: [] as string[],
  imageItems: [] as ProductImageDraftItem[],
  attributeRows: [{ key: '', value: '' }] as ProductAttributeRow[],
  isActive: true,
}

export function AdminProductsPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({})
  const [imageSubmitting, setImageSubmitting] = useState(false)
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'hide' | 'delete' | 'restore'; id: string; name: string }
    | { type: 'create' }
    | { type: 'update' }
    | { type: 'stock'; id: string; name: string; stock: number }
    | null
  >(null)
  const pageSize = 10

  const role = meQuery.data?.role ?? 'customer'
  const canIncludeInactive = isManager(role)

  const productsQuery = useAdminProductsQuery({
    page,
    page_size: pageSize,
    search: search || undefined,
    include_inactive: canIncludeInactive,
  })
  const categoriesQuery = useCategoriesQuery()
  const createMutation = useCreateProductMutation()
  const patchMutation = usePatchProductMutation()
  const stockMutation = usePatchProductStockMutation()
  const deactivateMutation = useDeactivateProductMutation()
  const deletePermanentMutation = useDeleteProductPermanentMutation()

  const totalPages = resolveTotalPages(
    productsQuery.data?.total ?? 0,
    pageSize,
    productsQuery.data?.pages,
  )

  function resetForm() {
    revokeProductImageDrafts(form.imageItems)
    setForm(emptyForm)
    setEditingId(null)
  }

  function toggleCategory(slug: string) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(slug)
        ? prev.categories.filter((c) => c !== slug)
        : [...prev.categories, slug],
    }))
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    setImageSubmitting(true)
    try {
      const image_urls = await resolveDraftItemsToUrls(form.imageItems)
      await createMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price,
        sale_price: form.salePrice === '' ? null : form.salePrice,
        stock: form.stock,
        categories: form.categories,
        image_urls,
        attributes: attributesToRecord(form.attributeRows),
        is_active: form.isActive,
      })
      revokeProductImageDrafts(form.imageItems)
      setShowCreate(false)
      setForm(emptyForm)
      setEditingId(null)
    } finally {
      setImageSubmitting(false)
    }
  }

  async function openEdit(id: string) {
    setShowCreate(false)
    revokeProductImageDrafts(form.imageItems)
    setEditingId(id)
    try {
      const detail = await fetchAdminProductDetail(id)
      setForm({
        name: detail.name,
        description: detail.description ?? '',
        price: detail.price,
        salePrice: detail.sale_price ?? '',
        stock: detail.stock,
        categories: detail.categories,
        imageItems: savedUrlsToDraftItems(detail.image_urls),
        attributeRows: recordToAttributeRows(detail.attributes),
        isActive: detail.is_active,
      })
    } catch {
      resetForm()
    }
  }

  async function handleUpdate() {
    if (!editingId || !form.name.trim()) return
    setImageSubmitting(true)
    try {
      const image_urls = await resolveDraftItemsToUrls(form.imageItems)
      await patchMutation.mutateAsync({
        id: editingId,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: form.price,
          sale_price: form.salePrice === '' ? null : form.salePrice,
          stock: form.stock,
          categories: form.categories,
          image_urls,
          attributes: attributesToRecord(form.attributeRows),
          is_active: form.isActive,
        },
      })
      revokeProductImageDrafts(form.imageItems)
      setForm(emptyForm)
      setEditingId(null)
    } finally {
      setImageSubmitting(false)
    }
  }

  async function submitConfirmAction() {
    if (!confirmAction) return
    try {
      if (confirmAction.type === 'create') {
        await handleCreate()
      } else if (confirmAction.type === 'update') {
        await handleUpdate()
      } else if (confirmAction.type === 'stock') {
        await stockMutation.mutateAsync({ id: confirmAction.id, stock: confirmAction.stock })
        setStockDrafts((prev) => {
          const next = { ...prev }
          delete next[confirmAction.id]
          return next
        })
      } else if (confirmAction.type === 'hide') {
        await deactivateMutation.mutateAsync(confirmAction.id)
      } else if (confirmAction.type === 'delete') {
        await deletePermanentMutation.mutateAsync(confirmAction.id)
      } else {
        await patchMutation.mutateAsync({ id: confirmAction.id, body: { is_active: true } })
      }
      setConfirmAction(null)
    } catch {
      // Lỗi hiển thị qua mutation.isError bên dưới
    }
  }

  const confirmPending =
    imageSubmitting ||
    createMutation.isPending ||
    patchMutation.isPending ||
    stockMutation.isPending ||
    deactivateMutation.isPending ||
    deletePermanentMutation.isPending

  if (meQuery.data && !canViewAdminProducts(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  const showForm = showCreate || editingId

  return (
    <PageShell title="Quản lý sản phẩm">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Tìm theo tên sản phẩm"
          className="w-full max-w-md rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        {canManageProducts(role) ? (
          <button
            type="button"
            onClick={() => {
              if (showCreate) {
                setShowCreate(false)
                resetForm()
              } else {
                revokeProductImageDrafts(form.imageItems)
                setShowCreate(true)
                setEditingId(null)
                setForm(emptyForm)
              }
            }}
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand"
          >
            {showCreate ? 'Đóng form' : 'Thêm sản phẩm'}
          </button>
        ) : null}
      </div>

      {showForm ? (
        <section className="mb-4 rounded-xl border border-border bg-surface-raised p-4">
          <h2 className="text-base font-semibold">
            {editingId ? `Cập nhật sản phẩm #${editingId.slice(-6)}` : 'Thêm sản phẩm mới'}
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <FormField label="Tên sản phẩm" htmlFor="product-name">
              <input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Rèm cửa vải linen trắng"
                className={inputClassName}
              />
            </FormField>

            <FormField label="Giá niêm yết (VND)" htmlFor="product-price">
              <input
                id="product-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value || 0) }))}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Giá khuyến mãi (VND, tuỳ chọn)" htmlFor="product-sale-price">
              <input
                id="product-sale-price"
                type="number"
                min={0}
                value={form.salePrice}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    salePrice: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="Để trống nếu không giảm giá"
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                Phải nhỏ hơn hoặc bằng giá niêm yết.
              </p>
            </FormField>

            <FormField label="Tồn kho" htmlFor="product-stock">
              <input
                id="product-stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value || 0) }))}
                className={inputClassName}
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Mô tả (tuỳ chọn)" htmlFor="product-desc">
                <textarea
                  id="product-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <ProductImagesField
                items={form.imageItems}
                onChange={(imageItems) => setForm((f) => ({ ...f, imageItems }))}
                disabled={!canManageProducts(role)}
              />
            </div>

            <div className="md:col-span-2">
              <ProductAttributesField
                rows={form.attributeRows}
                onChange={(attributeRows) => setForm((f) => ({ ...f, attributeRows }))}
                disabled={!canManageProducts(role)}
              />
            </div>

            <div className="md:col-span-2">
              <p className="mb-2 block text-sm font-medium text-foreground-muted">Danh mục</p>
              {categoriesQuery.isLoading ? (
                <p className="text-sm text-foreground-subtle">Đang tải danh mục…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categoriesQuery.data?.items.map((cat) => {
                    const checked = form.categories.includes(cat.slug)
                    return (
                      <label
                        key={cat.id}
                        className={`relative inline-flex cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                          checked
                            ? 'border-brand bg-brand-subtle text-brand'
                            : 'border-border text-foreground-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleCategory(cat.slug)}
                        />
                        {cat.name}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {editingId ? (
              <FormField label="Trạng thái hiển thị" htmlFor="product-active">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    id="product-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-border"
                  />
                  Hiển thị trên cửa hàng
                </label>
              </FormField>
            ) : null}
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
              disabled={
                imageSubmitting ||
                createMutation.isPending ||
                patchMutation.isPending ||
                !form.name.trim()
              }
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
            >
              {editingId ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm"
                onClick={resetForm}
              >
                Hủy sửa
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {productsQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {productsQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(productsQuery.error)}
        </p>
      ) : null}

      {deactivateMutation.isError || deletePermanentMutation.isError ? (
        <p className="mb-4 rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(deactivateMutation.error ?? deletePermanentMutation.error)}
        </p>
      ) : null}

      {productsQuery.data ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Giá</th>
                <th className="px-4 py-3">Tồn kho</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {productsQuery.data.items.map((item) => {
                const thumb = cdnImage(productPrimaryImageUrl(item), cdnPresets.adminTableThumb)
                const stockValue = stockDrafts[item.id] ?? item.stock
                const stockDirty = stockDrafts[item.id] !== undefined && stockDrafts[item.id] !== item.stock

                return (
                  <tr
                    key={item.id}
                    className="border-t border-border transition-colors hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-muted text-xs text-foreground-subtle">
                            N/A
                          </div>
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.is_on_sale ? (
                        <div>
                          <span className="font-medium text-brand">{formatVnd(item.effective_price)}</span>
                          <span className="ml-1 text-xs text-foreground-subtle line-through">
                            {formatVnd(item.price)}
                          </span>
                        </div>
                      ) : (
                        formatVnd(item.price)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canPatchProductStock(role) ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={stockValue}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({
                                ...prev,
                                [item.id]: Number(e.target.value || 0),
                              }))
                            }
                            className="w-20 rounded border border-border px-2 py-1 text-sm"
                          />
                          {stockDirty ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'stock',
                                  id: item.id,
                                  name: item.name,
                                  stock: stockValue,
                                })
                              }
                              disabled={stockMutation.isPending}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted disabled:opacity-50"
                            >
                              Lưu
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        item.stock
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {item.categories.length ? item.categories.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_active ? (
                        <span className="text-success-700">Đang bán</span>
                      ) : (
                        <span className="text-danger-700">Đã ẩn</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canManageProducts(role) ? (
                          <button
                            type="button"
                            onClick={() => void openEdit(item.id)}
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          >
                            Sửa
                          </button>
                        ) : null}
                        {canManageProducts(role) && item.is_active ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ type: 'hide', id: item.id, name: item.name })
                            }
                            className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          >
                            Ẩn SP
                          </button>
                        ) : null}
                        {canManageProducts(role) && !item.is_active ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({ type: 'restore', id: item.id, name: item.name })
                              }
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                            >
                              Bật lại
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({ type: 'delete', id: item.id, name: item.name })
                              }
                              className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                            >
                              Xóa vĩnh viễn
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {productsQuery.data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang sản phẩm"
        />
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          title={
            confirmAction.type === 'create'
              ? 'Tạo sản phẩm mới'
              : confirmAction.type === 'update'
                ? 'Lưu thay đổi sản phẩm'
                : confirmAction.type === 'stock'
                  ? 'Cập nhật tồn kho'
                  : confirmAction.type === 'hide'
                    ? 'Ẩn sản phẩm'
                    : confirmAction.type === 'delete'
                      ? 'Xóa vĩnh viễn'
                      : 'Bật lại sản phẩm'
          }
          description={
            confirmAction.type === 'create' ? (
              <>
                Tạo sản phẩm{' '}
                <span className="font-medium text-foreground">{form.name.trim()}</span> trên cửa
                hàng?
              </>
            ) : confirmAction.type === 'update' ? (
              <>
                Lưu thay đổi cho sản phẩm{' '}
                <span className="font-medium text-foreground">{form.name.trim()}</span>?
              </>
            ) : confirmAction.type === 'stock' ? (
              <>
                Cập nhật tồn kho <span className="font-medium text-foreground">{confirmAction.name}</span>{' '}
                thành <span className="font-medium text-foreground">{confirmAction.stock}</span>?
              </>
            ) : confirmAction.type === 'hide' ? (
              <>
                <span className="font-medium text-foreground">{confirmAction.name}</span> sẽ không
                hiển thị trên cửa hàng. Bạn có thể bật lại sau.
              </>
            ) : confirmAction.type === 'delete' ? (
              <>
                Xóa hẳn <span className="font-medium text-foreground">{confirmAction.name}</span>{' '}
                khỏi hệ thống. Chỉ thực hiện được khi sản phẩm chưa nằm trong đơn hàng nào.
              </>
            ) : (
              <>
                Hiển thị lại <span className="font-medium text-foreground">{confirmAction.name}</span>{' '}
                trên cửa hàng?
              </>
            )
          }
          confirmLabel={
            confirmAction.type === 'create'
              ? 'Tạo sản phẩm'
              : confirmAction.type === 'update'
                ? 'Lưu thay đổi'
                : confirmAction.type === 'stock'
                  ? 'Cập nhật tồn kho'
                  : confirmAction.type === 'hide'
                    ? 'Ẩn sản phẩm'
                    : confirmAction.type === 'delete'
                      ? 'Xóa vĩnh viễn'
                      : 'Bật lại'
          }
          variant={
            confirmAction.type === 'restore' ||
            confirmAction.type === 'create' ||
            confirmAction.type === 'update' ||
            confirmAction.type === 'stock'
              ? 'brand'
              : 'danger'
          }
          pending={confirmPending}
          error={
            createMutation.isError ||
            patchMutation.isError ||
            stockMutation.isError ||
            deactivateMutation.isError ||
            deletePermanentMutation.isError
              ? getErrorMessage(
                  createMutation.error ??
                    patchMutation.error ??
                    stockMutation.error ??
                    deletePermanentMutation.error ??
                    deactivateMutation.error,
                )
              : null
          }
          onConfirm={() => void submitConfirmAction()}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </PageShell>
  )
}
