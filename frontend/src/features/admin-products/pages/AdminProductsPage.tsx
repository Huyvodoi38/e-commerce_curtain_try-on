import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useMeQuery } from '@/features/auth/hooks'
import { fetchAdminProductDetail } from '@/features/admin-products/api'
import {
  useAdminProductsQuery,
  useCreateProductMutation,
  useDeactivateProductMutation,
  usePatchProductMutation,
  usePatchProductStockMutation,
} from '@/features/admin-products/hooks'
import { useCategoriesQuery } from '@/features/categories/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { productPrimaryImageUrl } from '@/lib/products/images'
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
  imageUrlsText: '',
  isActive: true,
}

function parseImageUrls(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function AdminProductsPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({})
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

  const totalPages = useMemo(() => {
    if (!productsQuery.data) return 1
    return Math.max(1, productsQuery.data.pages || 1)
  }, [productsQuery.data])

  function resetForm() {
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
    await createMutation.mutateAsync({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price,
      sale_price: form.salePrice === '' ? null : form.salePrice,
      stock: form.stock,
      categories: form.categories,
      image_urls: parseImageUrls(form.imageUrlsText),
      is_active: form.isActive,
    })
    setShowCreate(false)
    resetForm()
  }

  async function openEdit(id: string) {
    setShowCreate(false)
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
        imageUrlsText: detail.image_urls.join('\n'),
        isActive: detail.is_active,
      })
    } catch {
      resetForm()
    }
  }

  async function handleUpdate() {
    if (!editingId || !form.name.trim()) return
    await patchMutation.mutateAsync({
      id: editingId,
      body: {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price,
        sale_price: form.salePrice === '' ? null : form.salePrice,
        stock: form.stock,
        categories: form.categories,
        image_urls: parseImageUrls(form.imageUrlsText),
        is_active: form.isActive,
      },
    })
    resetForm()
  }

  async function handleStockSave(productId: string) {
    const stock = stockDrafts[productId]
    if (stock === undefined || stock < 0) return
    await stockMutation.mutateAsync({ id: productId, stock })
    setStockDrafts((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  if (meQuery.data && !canViewAdminProducts(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  const showForm = showCreate || editingId

  return (
    <PageShell
      title="Quản lý sản phẩm"
      description="Danh sách, tạo/sửa sản phẩm (quản lý) và cập nhật tồn kho (nhân viên)"
    >
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
              <FormField label="URL ảnh (mỗi dòng một link)" htmlFor="product-images">
                <textarea
                  id="product-images"
                  rows={3}
                  value={form.imageUrlsText}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrlsText: e.target.value }))}
                  placeholder="https://example.com/image1.jpg"
                  className={inputClassName}
                />
                <p className="mt-1 text-xs text-foreground-subtle">
                  Ảnh đầu tiên là ảnh chính hiển thị trên cửa hàng.
                </p>
              </FormField>
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
                        className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
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
              onClick={() => void (editingId ? handleUpdate() : handleCreate())}
              disabled={
                createMutation.isPending ||
                patchMutation.isPending ||
                !form.name.trim()
              }
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
            >
              {editingId
                ? patchMutation.isPending
                  ? 'Đang lưu…'
                  : 'Lưu thay đổi'
                : createMutation.isPending
                  ? 'Đang tạo…'
                  : 'Tạo sản phẩm'}
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
                const thumb = productPrimaryImageUrl(item)
                const stockValue = stockDrafts[item.id] ?? item.stock
                const stockDirty = stockDrafts[item.id] !== undefined && stockDrafts[item.id] !== item.stock

                return (
                  <tr key={item.id} className="border-t border-border">
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
                              onClick={() => void handleStockSave(item.id)}
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
                            onClick={() => void deactivateMutation.mutateAsync(item.id)}
                            className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                            disabled={deactivateMutation.isPending}
                          >
                            Ẩn SP
                          </button>
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

      {productsQuery.data && productsQuery.data.total > pageSize ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Trước
          </button>
          <span>
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="rounded border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      ) : null}
    </PageShell>
  )
}
