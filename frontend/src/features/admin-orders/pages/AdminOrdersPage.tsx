import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useMeQuery } from '@/features/auth/hooks'
import {
  useAdminOrdersQuery,
  useConfirmOrderPaymentMutation,
  useDeleteOrderPermanentMutation,
  useUpdateOrderStatusMutation,
} from '@/features/admin-orders/hooks'
import type { OrderStatus, PaymentStatus } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import { fulfillmentStatusLabel, paymentStatusLabel } from '@/lib/orders/statusLabels'
import { isManager } from '@/lib/permissions/permissions'
import { formatVnd } from '@/lib/utils/formatCurrency'

type ModalState =
  | { type: 'cancel'; orderId: string; orderLabel: string }
  | { type: 'ship'; orderId: string; orderLabel: string }
  | { type: 'deliver'; orderId: string; orderLabel: string }
  | { type: 'delete'; orderId: string; orderLabel: string }
  | { type: 'confirm_payment'; orderId: string; orderLabel: string }
  | null

function orderLabel(id: string): string {
  return `#${id.slice(-8)}`
}

const STATUS_FILTERS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const PAYMENT_STATUS_FILTERS: { value: '' | PaymentStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
]

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminOrdersPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | OrderStatus>('')
  const [paymentStatus, setPaymentStatus] = useState<'' | PaymentStatus>('')
  const [orderSearchDraft, setOrderSearchDraft] = useState('')
  const [orderSearchApplied, setOrderSearchApplied] = useState('')
  const [userIdDraft, setUserIdDraft] = useState('')
  const [userIdApplied, setUserIdApplied] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modalState, setModalState] = useState<ModalState>(null)
  const [reason, setReason] = useState('')
  const pageSize = 10
  const role = meQuery.data?.role ?? 'customer'
  const manager = isManager(role)

  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  const ordersQuery = useAdminOrdersQuery(
    {
      page,
      page_size: pageSize,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      user_id: userIdApplied.trim() || undefined,
      search: orderSearchApplied.trim() || undefined,
      from: !dateRangeInvalid && dateFrom ? dateFrom : undefined,
      to: !dateRangeInvalid && dateTo ? dateTo : undefined,
    },
    !dateRangeInvalid,
  )
  const confirmMutation = useConfirmOrderPaymentMutation()
  const statusMutation = useUpdateOrderStatusMutation()
  const deletePermanentMutation = useDeleteOrderPermanentMutation()

  const totalPages = resolveTotalPages(ordersQuery.data?.total ?? 0, pageSize)

  async function runStatusAction(nextStatus: OrderStatus, orderId: string, textReason?: string) {
    await statusMutation.mutateAsync({
      orderId,
      body: { status: nextStatus, ...(textReason ? { reason: textReason } : {}) },
    })
  }

  async function submitModal() {
    if (!modalState) return
    const trimmed = reason.trim()
    if (modalState.type === 'cancel' && !trimmed) return
    try {
      if (modalState.type === 'cancel') {
        await runStatusAction('cancelled', modalState.orderId, trimmed)
      } else if (modalState.type === 'ship') {
        await runStatusAction('shipped', modalState.orderId)
      } else if (modalState.type === 'deliver') {
        await runStatusAction('delivered', modalState.orderId)
      } else if (modalState.type === 'confirm_payment') {
        await confirmMutation.mutateAsync(modalState.orderId)
      } else {
        await deletePermanentMutation.mutateAsync(modalState.orderId)
      }
      setModalState(null)
      setReason('')
    } catch {
      // Lỗi hiển thị trong modal
    }
  }

  const modalPending =
    statusMutation.isPending || deletePermanentMutation.isPending || confirmMutation.isPending

  function applyTextFilters() {
    setOrderSearchApplied(orderSearchDraft.trim())
    setUserIdApplied(userIdDraft.trim())
    setPage(1)
  }

  function onDateFromChange(value: string) {
    setDateFrom(value)
    if (dateTo && value && value > dateTo) setDateTo(value)
    setPage(1)
  }

  function onDateToChange(value: string) {
    setDateTo(value)
    setPage(1)
  }

  function resetFilters() {
    setStatus('')
    setPaymentStatus('')
    setOrderSearchDraft('')
    setOrderSearchApplied('')
    setUserIdDraft('')
    setUserIdApplied('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(status) ||
    Boolean(paymentStatus) ||
    Boolean(orderSearchApplied) ||
    Boolean(userIdApplied) ||
    Boolean(dateFrom) ||
    Boolean(dateTo)

  return (
    <PageShell title="Quản lý đơn hàng">
      <div className="mb-4 space-y-3 rounded-xl border border-border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">Giao hàng:</span>
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => {
                setStatus(item.value)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1.5 text-sm ${
                status === item.value
                  ? 'bg-brand text-on-brand'
                  : 'bg-surface-muted text-foreground-muted hover:bg-surface-raised'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">Thanh toán:</span>
          {PAYMENT_STATUS_FILTERS.map((item) => (
            <button
              key={item.value || 'all-pay'}
              type="button"
              onClick={() => {
                setPaymentStatus(item.value)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1.5 text-sm ${
                paymentStatus === item.value
                  ? 'bg-brand text-on-brand'
                  : 'bg-surface-muted text-foreground-muted hover:bg-surface-raised'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-foreground-muted">
            Từ ngày
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-foreground-muted">
            Đến ngày
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => onDateToChange(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          {dateRangeInvalid ? (
            <p className="pb-2 text-sm text-danger-700">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={orderSearchDraft}
            onChange={(e) => setOrderSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyTextFilters()
            }}
            placeholder="Mã đơn (8 ký tự cuối hoặc ObjectId)"
            className="min-w-[12rem] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
          <input
            type="search"
            value={userIdDraft}
            onChange={(e) => setUserIdDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyTextFilters()
            }}
            placeholder="Mã khách hàng (user_id)"
            className="min-w-[12rem] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={applyTextFilters}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-muted"
          >
            Lọc
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      </div>

      {ordersQuery.data ? (
        <p className="mb-3 text-sm text-foreground-muted">
          {ordersQuery.data.total === 0
            ? 'Không có đơn phù hợp bộ lọc.'
            : `Tìm thấy ${ordersQuery.data.total} đơn`}
        </p>
      ) : null}

      {ordersQuery.isLoading ? <div className="h-48 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {ordersQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(ordersQuery.error)}
        </p>
      ) : null}

      {ordersQuery.data ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-foreground-muted">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Tổng</th>
                <th className="px-4 py-3">Tạo lúc</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">
                    Không có đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : null}
              {ordersQuery.data.items.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-border transition-colors hover:bg-surface-muted"
                >
                  <td className="px-4 py-3 font-mono">#{order.id.slice(-8)}</td>
                  <td className="px-4 py-3">
                    {fulfillmentStatusLabel(order.status, order.payment_status)}
                  </td>
                  <td className="px-4 py-3">{paymentStatusLabel(order.payment_status)}</td>
                  <td className="px-4 py-3 font-semibold text-brand">{formatVnd(order.total_amount)}</td>
                  <td className="px-4 py-3">{formatOrderDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                      >
                        Chi tiết
                      </Link>
                      {order.payment_status === 'unpaid' ? (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          disabled={confirmMutation.isPending}
                          onClick={() =>
                            setModalState({
                              type: 'confirm_payment',
                              orderId: order.id,
                              orderLabel: orderLabel(order.id),
                            })
                          }
                        >
                          Xác nhận thanh toán
                        </button>
                      ) : null}
                      {order.status === 'pending' ? (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          onClick={() =>
                            setModalState({
                              type: 'ship',
                              orderId: order.id,
                              orderLabel: orderLabel(order.id),
                            })
                          }
                        >
                          Đánh dấu đang giao
                        </button>
                      ) : null}
                      {order.status === 'shipped' ? (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          onClick={() =>
                            setModalState({
                              type: 'deliver',
                              orderId: order.id,
                              orderLabel: orderLabel(order.id),
                            })
                          }
                        >
                          Đánh dấu đã giao
                        </button>
                      ) : null}
                      {order.status !== 'cancelled' && order.status !== 'delivered' ? (
                        <button
                          type="button"
                          className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          onClick={() =>
                            setModalState({
                              type: 'cancel',
                              orderId: order.id,
                              orderLabel: orderLabel(order.id),
                            })
                          }
                        >
                          Hủy đơn
                        </button>
                      ) : null}
                      {manager && order.status === 'cancelled' ? (
                        <button
                          type="button"
                          className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          onClick={() =>
                            setModalState({
                              type: 'delete',
                              orderId: order.id,
                              orderLabel: orderLabel(order.id),
                            })
                          }
                        >
                          Xóa vĩnh viễn
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

      {ordersQuery.data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang đơn hàng"
        />
      ) : null}

      {modalState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-raised p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {modalState.type === 'cancel'
                ? 'Hủy đơn hàng'
                : modalState.type === 'delete'
                  ? 'Xóa vĩnh viễn'
                  : modalState.type === 'confirm_payment'
                    ? 'Xác nhận thanh toán'
                    : modalState.type === 'ship'
                      ? 'Đánh dấu đang giao'
                      : 'Đánh dấu đã giao'}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {modalState.type === 'cancel' ? (
                <>
                  Hủy đơn <span className="font-medium text-foreground">{modalState.orderLabel}</span>.
                  Bắt buộc nhập lý do. Sau khi hủy, quản lý có thể xóa vĩnh viễn.
                </>
              ) : modalState.type === 'confirm_payment' ? (
                <>
                  Xác nhận đơn{' '}
                  <span className="font-medium text-foreground">{modalState.orderLabel}</span> đã
                  thanh toán (chuyển khoản / tiền mặt)?
                </>
              ) : modalState.type === 'delete' ? (
                <>
                  Xóa hẳn đơn{' '}
                  <span className="font-medium text-foreground">{modalState.orderLabel}</span> khỏi hệ
                  thống. Thao tác không thể hoàn tác.
                </>
              ) : (
                <>
                  Cập nhật đơn{' '}
                  <span className="font-medium text-foreground">{modalState.orderLabel}</span>?
                </>
              )}
            </p>
            {modalState.type === 'cancel' ? (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-3 min-h-24 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
                placeholder="Nhập lý do hủy đơn"
              />
            ) : null}
            {(statusMutation.isError || deletePermanentMutation.isError || confirmMutation.isError) &&
            modalState ? (
              <p className="mt-2 text-sm text-danger-700">
                {getErrorMessage(
                  statusMutation.error ?? deletePermanentMutation.error ?? confirmMutation.error,
                )}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
                disabled={modalPending}
                onClick={() => {
                  setModalState(null)
                  setReason('')
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  modalState.type === 'delete'
                    ? 'bg-danger-700 hover:opacity-90'
                    : 'bg-brand hover:bg-brand-hover'
                }`}
                onClick={() => void submitModal()}
                disabled={
                  modalPending || (modalState.type === 'cancel' && !reason.trim())
                }
              >
                {modalPending
                  ? 'Đang xử lý…'
                  : modalState.type === 'cancel'
                    ? 'Hủy đơn'
                    : modalState.type === 'delete'
                      ? 'Xóa vĩnh viễn'
                      : modalState.type === 'confirm_payment'
                        ? 'Xác nhận thanh toán'
                        : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
