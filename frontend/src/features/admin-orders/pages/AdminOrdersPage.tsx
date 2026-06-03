import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { useState } from 'react'
import {
  useAdminOrdersQuery,
  useConfirmOrderPaymentMutation,
  useUpdateOrderStatusMutation,
} from '@/features/admin-orders/hooks'
import type { OrderStatus } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import { fulfillmentStatusLabel, paymentStatusLabel } from '@/lib/orders/statusLabels'
import { formatVnd } from '@/lib/utils/formatCurrency'

type ModalState =
  | { type: 'cancel'; orderId: string }
  | { type: 'ship'; orderId: string }
  | { type: 'deliver'; orderId: string }
  | null

const STATUS_FILTERS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
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
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | OrderStatus>('')
  const [modalState, setModalState] = useState<ModalState>(null)
  const [reason, setReason] = useState('')
  const pageSize = 10

  const ordersQuery = useAdminOrdersQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
  })
  const confirmMutation = useConfirmOrderPaymentMutation()
  const statusMutation = useUpdateOrderStatusMutation()

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
    if (modalState.type === 'cancel') await runStatusAction('cancelled', modalState.orderId, trimmed)
    if (modalState.type === 'ship') await runStatusAction('shipped', modalState.orderId)
    if (modalState.type === 'deliver') await runStatusAction('delivered', modalState.orderId)
    setModalState(null)
    setReason('')
  }

  return (
    <PageShell
      title="Quản lý đơn hàng"
      description="Confirm payment, ship, deliver, cancel (reason)"
    >
      <div className="mb-4 flex flex-wrap gap-2">
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
              {ordersQuery.data.items.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">#{order.id.slice(-8)}</td>
                  <td className="px-4 py-3">
                    {fulfillmentStatusLabel(order.status, order.payment_status)}
                  </td>
                  <td className="px-4 py-3">{paymentStatusLabel(order.payment_status)}</td>
                  <td className="px-4 py-3 font-semibold text-brand">{formatVnd(order.total_amount)}</td>
                  <td className="px-4 py-3">{formatOrderDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {order.payment_status === 'unpaid' ? (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          disabled={confirmMutation.isPending}
                          onClick={() => void confirmMutation.mutateAsync(order.id)}
                        >
                          Xác nhận thanh toán
                        </button>
                      ) : null}
                      {order.status === 'pending' ? (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          onClick={() => setModalState({ type: 'ship', orderId: order.id })}
                        >
                          Đánh dấu đang giao
                        </button>
                      ) : null}
                      {order.status === 'shipped' ? (
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                          onClick={() => setModalState({ type: 'deliver', orderId: order.id })}
                        >
                          Đánh dấu đã giao
                        </button>
                      ) : null}
                      {order.status !== 'cancelled' && order.status !== 'delivered' ? (
                        <button
                          type="button"
                          className="rounded border border-danger-700/30 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          onClick={() => setModalState({ type: 'cancel', orderId: order.id })}
                        >
                          Hủy đơn
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
          <div className="w-full max-w-md rounded-xl bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">Xác nhận thao tác</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {modalState.type === 'cancel'
                ? 'Hủy đơn bắt buộc nhập lý do.'
                : 'Bạn có chắc muốn cập nhật trạng thái đơn hàng?'}
            </p>
            {modalState.type === 'cancel' ? (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-3 min-h-24 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
                placeholder="Nhập lý do hủy đơn"
              />
            ) : null}
            {statusMutation.isError ? (
              <p className="mt-2 text-sm text-danger-700">{getErrorMessage(statusMutation.error)}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm"
                onClick={() => {
                  setModalState(null)
                  setReason('')
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                className="rounded bg-brand px-3 py-1.5 text-sm text-on-brand disabled:opacity-50"
                onClick={() => void submitModal()}
                disabled={statusMutation.isPending || (modalState.type === 'cancel' && !reason.trim())}
              >
                {statusMutation.isPending ? 'Đang cập nhật…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
