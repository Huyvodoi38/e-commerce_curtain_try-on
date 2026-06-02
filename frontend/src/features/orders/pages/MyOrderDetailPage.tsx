import { Link, useLocation, useParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { BankInstructionsCard } from '@/features/orders/components/BankInstructionsCard'
import { OrderItemsList } from '@/features/orders/components/OrderItemsList'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { useCancelMyOrderMutation, useMyOrderDetailQuery } from '@/features/orders/hooks'
import type { BankInstructions } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import {
  canCustomerCancelOrder,
  paymentMethodLabel,
} from '@/lib/orders/statusLabels'
import { formatShippingAddress } from '@/lib/vietnam-admin/formatAddress'
import { formatVnd } from '@/lib/utils/formatCurrency'
import { getBankInstructions } from '@/lib/orders/bankInstructionsStore'

type LocationState = {
  bankInstructions?: BankInstructions | null
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MyOrderDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navState = (location.state as LocationState | null) ?? null
  const orderQuery = useMyOrderDetailQuery(id)
  const cancelMutation = useCancelMyOrderMutation(id)

  const order = orderQuery.data
  const bankFromNav = navState?.bankInstructions ?? getBankInstructions(id)
  const showBank =
    bankFromNav &&
    order?.offline_subtype === 'bank' &&
    order.payment_status === 'unpaid' &&
    order.status === 'pending'

  async function handleCancel() {
    if (!order) return
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return
    await cancelMutation.mutateAsync()
  }

  if (orderQuery.isLoading) {
    return (
      <PageShell title="Chi tiết đơn">
        <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />
      </PageShell>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <PageShell title="Chi tiết đơn">
        <div className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          Không tải được đơn: {getErrorMessage(orderQuery.error)}
        </div>
        <Link to="/orders" className="mt-4 inline-block text-sm text-brand hover:underline">
          Quay lại danh sách
        </Link>
      </PageShell>
    )
  }

  const addr = order.shipping_address
  const canCancel = canCustomerCancelOrder(order.status, order.payment_status)

  return (
    <PageShell title={`Đơn #${order.id.slice(-8)}`} description={formatOrderDate(order.created_at)}>
      <nav className="mb-4 text-sm">
        <Link to="/orders" className="text-brand hover:underline">
          ← Đơn hàng của tôi
        </Link>
      </nav>

      <div className="space-y-6">
        <OrderStatusBadge status={order.status} paymentStatus={order.payment_status} />

        {showBank ? <BankInstructionsCard instructions={bankFromNav} /> : null}

        {order.offline_subtype === 'bank' &&
        order.payment_status === 'unpaid' &&
        order.status === 'pending' &&
        !showBank ? (
          <p className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-foreground-muted">
            Không tìm thấy thông tin chuyển khoản đã lưu trên thiết bị này. Vui lòng liên hệ hỗ trợ
            với mã đơn <span className="font-mono">{order.id}</span>.
          </p>
        ) : null}

        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="font-semibold text-foreground">Sản phẩm</h2>
          <div className="mt-3">
            <OrderItemsList items={order.items} />
          </div>
          <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Tạm tính</dt>
              <dd>{formatVnd(order.subtotal)}</dd>
            </div>
            {order.discount_amount > 0 ? (
              <div className="flex justify-between text-success-700">
                <dt>
                  Giảm giá
                  {order.promotion_code ? ` (${order.promotion_code})` : ''}
                </dt>
                <dd>−{formatVnd(order.discount_amount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-semibold text-brand">
              <dt>Tổng cộng</dt>
              <dd>{formatVnd(order.total_amount)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface-raised p-5 text-sm">
          <h2 className="font-semibold text-foreground">Giao hàng & thanh toán</h2>
          <p className="mt-2 text-foreground-muted">
            {paymentMethodLabel(order.payment_method, order.offline_subtype)}
          </p>
          {order.payment_method === 'vnpay' &&
          order.payment_status === 'unpaid' &&
          order.status === 'pending' ? (
            <Link
              to={`/orders/${order.id}/pay`}
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Tiếp tục thanh toán VNPay
            </Link>
          ) : null}
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
        </section>

        {canCancel ? (
          <div>
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => void handleCancel()}
              className="rounded-md border border-danger-700/30 px-4 py-2 text-sm font-medium text-danger-700 hover:bg-danger-50 disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Đang hủy…' : 'Hủy đơn hàng'}
            </button>
            {cancelMutation.isError ? (
              <p className="mt-2 text-sm text-danger-700">{getErrorMessage(cancelMutation.error)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageShell>
  )
}
