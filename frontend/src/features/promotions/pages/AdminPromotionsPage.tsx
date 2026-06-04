import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useMeQuery } from '@/features/auth/hooks'
import {
  useCreatePromotionMutation,
  useDeactivatePromotionMutation,
  usePatchPromotionMutation,
  usePromotionsQuery,
} from '@/features/promotions/hooks'
import { fetchPromotionDetail } from '@/features/promotions/api'
import type { DiscountType } from '@/features/promotions/types'
import { getErrorMessage } from '@/lib/api/client'
import { canManagePromotions, isManager } from '@/lib/permissions/permissions'
import { formatVnd } from '@/lib/utils/formatCurrency'

function toIsoLocal(input: string): string {
  return new Date(input).toISOString()
}

export function AdminPromotionsPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('percentage')
  const [discountValue, setDiscountValue] = useState(10)
  const [minOrderValue, setMinOrderValue] = useState(0)
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | ''>('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'create' }
    | { type: 'update' }
    | { type: 'hide'; id: string; code: string }
    | null
  >(null)
  const pageSize = 10

  const canIncludeInactive = Boolean(meQuery.data && isManager(meQuery.data.role))
  const promotionsQuery = usePromotionsQuery({
    page,
    page_size: pageSize,
    search: search || undefined,
    include_inactive: canIncludeInactive,
  })
  const createMutation = useCreatePromotionMutation()
  const patchMutation = usePatchPromotionMutation()
  const deactivateMutation = useDeactivatePromotionMutation()

  const totalPages = resolveTotalPages(
    promotionsQuery.data?.total ?? 0,
    pageSize,
    promotionsQuery.data?.pages,
  )

  async function handleCreate() {
    if (!code.trim() || !startDate || !endDate) return
    await createMutation.mutateAsync({
      code: code.trim(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: discountValue,
      min_order_value: minOrderValue,
      max_discount_amount: maxDiscountAmount === '' ? null : maxDiscountAmount,
      usage_limit: usageLimit === '' ? null : usageLimit,
      start_date: toIsoLocal(startDate),
      end_date: toIsoLocal(endDate),
      is_active: true,
    })
    setShowCreate(false)
    setCode('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue(10)
    setMinOrderValue(0)
    setMaxDiscountAmount('')
    setUsageLimit('')
    setStartDate('')
    setEndDate('')
  }

  async function submitConfirm() {
    if (!confirmAction) return
    try {
      if (confirmAction.type === 'create') {
        await handleCreate()
      } else if (confirmAction.type === 'update') {
        await handleUpdate()
      } else {
        await deactivateMutation.mutateAsync(confirmAction.id)
      }
      setConfirmAction(null)
    } catch {
      // lỗi hiển thị trong modal
    }
  }

  async function openEdit(id: string) {
    setShowCreate(false)
    setEditingId(id)
    try {
      const detail = await fetchPromotionDetail(id)
      setCode(detail.code)
      setDescription(detail.description ?? '')
      setDiscountType(detail.discount_type)
      setDiscountValue(detail.discount_value)
      setMinOrderValue(detail.min_order_value)
      setMaxDiscountAmount(detail.max_discount_amount ?? '')
      setUsageLimit(detail.usage_limit ?? '')
      setStartDate(detail.start_date.slice(0, 16))
      setEndDate(detail.end_date.slice(0, 16))
    } catch {
      setEditingId(null)
    }
  }

  async function handleUpdate() {
    if (!editingId || !code.trim() || !startDate || !endDate) return
    await patchMutation.mutateAsync({
      id: editingId,
      body: {
        code: code.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_value: minOrderValue,
        max_discount_amount: maxDiscountAmount === '' ? null : maxDiscountAmount,
        usage_limit: usageLimit === '' ? null : usageLimit,
        start_date: toIsoLocal(startDate),
        end_date: toIsoLocal(endDate),
      },
    })
    setEditingId(null)
    setCode('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue(10)
    setMinOrderValue(0)
    setMaxDiscountAmount('')
    setUsageLimit('')
    setStartDate('')
    setEndDate('')
  }

  if (meQuery.data && !canManagePromotions(meQuery.data.role)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <PageShell title="Quản lý khuyến mãi" description="Danh sách, tạo mới, và ẩn mã khuyến mãi">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo code hoặc mô tả"
          className="w-full max-w-md rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
        />
        {isManager(meQuery.data?.role ?? 'customer') ? (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand"
          >
            {showCreate ? 'Đóng form' : 'Tạo mã mới'}
          </button>
        ) : null}
      </div>

      {showCreate || editingId ? (
        <section className="mb-4 rounded-xl border border-border bg-surface-raised p-4">
          <h2 className="text-base font-semibold">
            {editingId ? `Cập nhật mã khuyến mãi #${editingId.slice(-6)}` : 'Tạo mã khuyến mãi'}
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <FormField label="Mã khuyến mãi" htmlFor="promo-code">
              <input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: REM10"
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                Khách nhập mã này khi thanh toán. Tự chuyển thành chữ in hoa.
              </p>
            </FormField>

            <FormField label="Mô tả (tuỳ chọn)" htmlFor="promo-desc">
              <input
                id="promo-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Giảm 10% cho đơn từ 500k"
                className={inputClassName}
              />
            </FormField>

            <FormField label="Loại giảm giá" htmlFor="promo-discount-type">
              <select
                id="promo-discount-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className={inputClassName}
              >
                <option value="percentage">Theo phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (VND)</option>
              </select>
            </FormField>

            <FormField
              label={discountType === 'percentage' ? 'Giá trị giảm (%)' : 'Giá trị giảm (VND)'}
              htmlFor="promo-discount-value"
            >
              <input
                id="promo-discount-value"
                type="number"
                min={1}
                max={discountType === 'percentage' ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value || 0))}
                placeholder={discountType === 'percentage' ? 'VD: 10 (= giảm 10%)' : 'VD: 50000'}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Giá trị đơn tối thiểu (VND)" htmlFor="promo-min-order">
              <input
                id="promo-min-order"
                type="number"
                min={0}
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(Number(e.target.value || 0))}
                placeholder="0 = không yêu cầu tối thiểu"
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                Tổng tiền hàng trước giảm phải đạt mức này mới áp dụng được mã.
              </p>
            </FormField>

            <FormField label="Trần giảm tối đa (VND, tuỳ chọn)" htmlFor="promo-max-cap">
              <input
                id="promo-max-cap"
                type="number"
                min={1}
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Chỉ dùng khi loại % — để trống nếu không giới hạn"
                className={inputClassName}
                disabled={discountType === 'fixed'}
              />
              {discountType === 'fixed' ? (
                <p className="mt-1 text-xs text-foreground-subtle">
                  Không áp dụng khi giảm theo số tiền cố định.
                </p>
              ) : null}
            </FormField>

            <FormField label="Giới hạn lượt sử dụng (tuỳ chọn)" htmlFor="promo-usage-limit">
              <input
                id="promo-usage-limit"
                type="number"
                min={1}
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Để trống = không giới hạn"
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                Tổng số lần toàn hệ thống được dùng mã này.
              </p>
            </FormField>

            <div className="hidden md:block" aria-hidden />

            <FormField label="Ngày bắt đầu có hiệu lực" htmlFor="promo-start">
              <input
                id="promo-start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Ngày hết hạn" htmlFor="promo-end">
              <input
                id="promo-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                Sau thời điểm này khách không thể áp dụng mã.
              </p>
            </FormField>
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
                createMutation.isPending ||
                patchMutation.isPending ||
                !code.trim() ||
                !startDate ||
                !endDate
              }
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
            >
              {editingId ? 'Lưu thay đổi' : 'Tạo mã'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId(null)
                  setCode('')
                  setDescription('')
                  setDiscountType('percentage')
                  setDiscountValue(10)
                  setMinOrderValue(0)
                  setMaxDiscountAmount('')
                  setUsageLimit('')
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Hủy sửa
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {promotionsQuery.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {promotionsQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(promotionsQuery.error)}
        </p>
      ) : null}

      {promotionsQuery.data ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Giảm</th>
                <th className="px-4 py-3">Đơn tối thiểu</th>
                <th className="px-4 py-3">Lượt dùng</th>
                <th className="px-4 py-3">Hiệu lực</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {promotionsQuery.data.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-border transition-colors hover:bg-surface-muted"
                >
                  <td className="px-4 py-3 font-semibold">{item.code}</td>
                  <td className="px-4 py-3">
                    {item.discount_type === 'percentage'
                      ? `${item.discount_value}%`
                      : formatVnd(item.discount_value)}
                  </td>
                  <td className="px-4 py-3">{formatVnd(item.min_order_value)}</td>
                  <td className="px-4 py-3">
                    {item.used_count}/{item.usage_limit ?? '∞'}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(item.start_date).toLocaleDateString('vi-VN')} -{' '}
                    {new Date(item.end_date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    {item.is_active ? (
                      <span className="text-success-700">Đang hoạt động</span>
                    ) : (
                      <span className="text-danger-700">Đã ẩn</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {isManager(meQuery.data?.role ?? 'customer') ? (
                        <button
                          type="button"
                          onClick={() => void openEdit(item.id)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                        >
                          Sửa
                        </button>
                      ) : null}
                      {isManager(meQuery.data?.role ?? 'customer') && item.is_active ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({ type: 'hide', id: item.id, code: item.code })
                          }
                          className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          disabled={deactivateMutation.isPending}
                        >
                          Ẩn mã
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

      {promotionsQuery.data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang khuyến mãi"
        />
      ) : null}
      {confirmAction ? (
        <ConfirmDialog
          title={
            confirmAction.type === 'create'
              ? 'Tạo mã khuyến mãi'
              : confirmAction.type === 'update'
                ? 'Lưu thay đổi mã'
                : 'Ẩn mã khuyến mãi'
          }
          description={
            confirmAction.type === 'create' ? (
              <>
                Tạo mã <span className="font-medium text-foreground">{code.trim()}</span> trên hệ
                thống?
              </>
            ) : confirmAction.type === 'update' ? (
              <>
                Lưu thay đổi cho mã{' '}
                <span className="font-medium text-foreground">{code.trim()}</span>?
              </>
            ) : (
              <>
                Ẩn mã <span className="font-medium text-foreground">{confirmAction.code}</span>. Khách
                sẽ không dùng được mã này nữa.
              </>
            )
          }
          confirmLabel={
            confirmAction.type === 'create'
              ? 'Tạo mã'
              : confirmAction.type === 'update'
                ? 'Lưu thay đổi'
                : 'Ẩn mã'
          }
          variant={confirmAction.type === 'hide' ? 'danger' : 'brand'}
          pending={
            createMutation.isPending || patchMutation.isPending || deactivateMutation.isPending
          }
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
