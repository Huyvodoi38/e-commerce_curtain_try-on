import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { useMeQuery } from '@/features/auth/hooks'
import {
  useAdminOrderDetailQuery,
  useConfirmOrderPaymentMutation,
  useDeleteOrderPermanentMutation,
  useUpdateOrderStatusMutation,
} from '@/features/admin-orders/hooks'
import { OrderItemsList } from '@/features/orders/components/OrderItemsList'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import type { OrderStatus } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import { paymentMethodLabel } from '@/lib/orders/statusLabels'
import { isManager } from '@/lib/permissions/permissions'
import { formatShippingAddress } from '@/lib/vietnam-admin/formatAddress'
import { formatVnd } from '@/lib/utils/formatCurrency'

type ModalState = 'cancel' | 'ship' | 'deliver' | 'delete' | 'confirm_payment' | null

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const role = meQuery.data?.role ?? 'customer'
  const manager = isManager(role)

  const orderQuery = useAdminOrderDetailQuery(id)
  const confirmMutation = useConfirmOrderPaymentMutation()
  const statusMutation = useUpdateOrderStatusMutation()
  const deletePermanentMutation = useDeleteOrderPermanentMutation()

  const [modal, setModal] = useState<ModalState>(null)
  const [reason, setReason] = useState('')

  const order = orderQuery.data
  const label = order ? `#${order.id.slice(-8)}` : ''

  async function runStatus(next: OrderStatus, textReason?: string) {
    if (!order) return
    await statusMutation.mutateAsync({
      orderId: order.id,
      body: { status: next, ...(textReason ? { reason: textReason } : {}) },
    })
  }

  async function submitModal() {
    if (!order || !modal) return
    const trimmed = reason.trim()
    if (modal === 'cancel' && !trimmed) return
    try {
      if (modal === 'cancel') await runStatus('cancelled', trimmed)
      else if (modal === 'ship') await runStatus('shipped')
      else if (modal === 'deliver') await runStatus('delivered')
      else if (modal === 'confirm_payment') await confirmMutation.mutateAsync(order.id)
      else {
        await deletePermanentMutation.mutateAsync(order.id)
        navigate('/admin/orders')
        return
      }
      setModal(null)
      setReason('')
    } catch {
      // hiển thị lỗi trong modal
    }
  }

  const modalPending =
    statusMutation.isPending || deletePermanentMutation.isPending || confirmMutation.isPending

  if (orderQuery.isLoading) {
    return (
      <PageShell title="Chi tiết đơn hàng">
        <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />
      </PageShell>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <PageShell title="Chi tiết đơn hàng">
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(orderQuery.error)}
        </p>
        <Link to="/admin/orders" className="mt-4 inline-block text-sm text-brand hover:underline">
          ← Quay lại danh sách
        </Link>
      </PageShell>
    )
  }

  const addr = order.shipping_address

  return (
    <PageShell title={`Đơn ${label}`} description={formatOrderDate(order.created_at)}>
      <nav className="mb-4 text-sm">
        <Link to="/admin/orders" className="text-brand hover:underline">
          ← Quản lý đơn hàng
        </Link>
      </nav>

      <div className="mb-4">
        <OrderStatusBadge status={order.status} paymentStatus={order.payment_status} />
      </div>

      <section className="mb-4 rounded-xl border border-border bg-surface-raised p-4 text-sm">
        <h2 className="font-semibold text-foreground">Khách hàng</h2>
        <p className="mt-2 font-mono text-xs text-foreground-subtle">{order.user_id}</p>
        <Link
          to={`/admin/customers/${order.user_id}/logs`}
          className="mt-2 inline-block text-brand hover:underline"
        >
          Xem nhật ký khách hàng
        </Link>
      </section>

      <section className="mb-4 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="font-semibold text-foreground">Sản phẩm</h2>
        <div className="mt-3">
          <OrderItemsList items={order.items} linkToProduct={false} />
        </div>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground-muted">Tạm tính</dt>
            <dd>{formatVnd(order.subtotal)}</dd>
          </div>
          {order.discount_amount > 0 ? (
            <div className="flex justify-between text-success-700">
              <dt>Giảm giá{order.promotion_code ? ` (${order.promotion_code})` : ''}</dt>
              <dd>−{formatVnd(order.discount_amount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold text-brand">
            <dt>Tổng cộng</dt>
            <dd>{formatVnd(order.total_amount)}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-surface-raised p-5 text-sm">
        <h2 className="font-semibold text-foreground">Giao hàng & thanh toán</h2>
        <p className="mt-2 text-foreground-muted">
          {paymentMethodLabel(order.payment_method, order.offline_subtype)}
        </p>
        <address className="mt-4 not-italic text-foreground-muted">
          <span className="font-medium text-foreground">{addr.full_name}</span>
          <br />
          {addr.phone}
          <br />
          {formatShippingAddress(addr)}
          {addr.note ? (
            <>
              <br />
              Ghi chú: {addr.note}
            </>
          ) : null}
        </address>
        {order.paid_at ? (
          <p className="mt-3 text-foreground-muted">
            Đã xác nhận thanh toán: {formatOrderDate(order.paid_at)}
          </p>
        ) : null}
        <p className="mt-2 font-mono text-xs text-foreground-subtle">Mã đơn đầy đủ: {order.id}</p>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Thao tác</h2>
        <div className="flex flex-wrap gap-2">
          {order.payment_status === 'unpaid' ? (
            <button
              type="button"
              className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-50"
              disabled={confirmMutation.isPending}
              onClick={() => setModal('confirm_payment')}
            >
              Xác nhận thanh toán
            </button>
          ) : null}
          {order.status === 'pending' && order.payment_status === 'paid' ? (
            <button
              type="button"
              className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm hover:bg-surface-muted"
              onClick={() => setModal('ship')}
            >
              Đánh dấu đang giao
            </button>
          ) : null}
          {order.status === 'shipped' ? (
            <button
              type="button"
              className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm hover:bg-surface-muted"
              onClick={() => setModal('deliver')}
            >
              Đánh dấu đã giao
            </button>
          ) : null}
          {order.status !== 'cancelled' && order.status !== 'delivered' ? (
            <button
              type="button"
              className="rounded-md border border-danger-700/30 px-3 py-2 text-sm text-danger-700 hover:bg-danger-50"
              onClick={() => setModal('cancel')}
            >
              Hủy đơn
            </button>
          ) : null}
          {manager && order.status === 'cancelled' ? (
            <button
              type="button"
              className="rounded-md border border-danger-700/30 px-3 py-2 text-sm text-danger-700 hover:bg-danger-50"
              onClick={() => setModal('delete')}
            >
              Xóa vĩnh viễn
            </button>
          ) : null}
        </div>
        {confirmMutation.isError ? (
          <p className="mt-2 text-sm text-danger-700">{getErrorMessage(confirmMutation.error)}</p>
        ) : null}
      </section>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-raised p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {modal === 'cancel'
                ? 'Hủy đơn hàng'
                : modal === 'delete'
                  ? 'Xóa vĩnh viễn'
                  : modal === 'confirm_payment'
                    ? 'Xác nhận thanh toán'
                    : modal === 'ship'
                      ? 'Đánh dấu đang giao'
                      : 'Đánh dấu đã giao'}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {modal === 'cancel' ? (
                <>Hủy đơn {label}. Bắt buộc nhập lý do.</>
              ) : modal === 'confirm_payment' ? (
                <>Xác nhận đơn {label} đã thanh toán (chuyển khoản / tiền mặt)?</>
              ) : modal === 'delete' ? (
                <>Xóa hẳn đơn {label} khỏi hệ thống. Không thể hoàn tác.</>
              ) : (
                <>Cập nhật trạng thái đơn {label}?</>
              )}
            </p>
            {modal === 'cancel' ? (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-3 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Nhập lý do hủy đơn"
              />
            ) : null}
            {(statusMutation.isError || deletePermanentMutation.isError || confirmMutation.isError) && (
              <p className="mt-2 text-sm text-danger-700">
                {getErrorMessage(
                  statusMutation.error ?? deletePermanentMutation.error ?? confirmMutation.error,
                )}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={modalPending}
                onClick={() => {
                  setModal(null)
                  setReason('')
                }}
                className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={modalPending || (modal === 'cancel' && !reason.trim())}
                onClick={() => void submitModal()}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  modal === 'delete' ? 'bg-danger-700 hover:opacity-90' : 'bg-brand'
                }`}
              >
                {modalPending
                  ? 'Đang xử lý…'
                  : modal === 'confirm_payment'
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
