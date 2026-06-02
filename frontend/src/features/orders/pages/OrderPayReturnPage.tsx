import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { useMyOrderDetailQuery } from '@/features/orders/hooks'
import { getErrorMessage } from '@/lib/api/client'

const POLL_MS = 3000
const POLL_MAX_MS = 15 * 60 * 1000

export function OrderPayReturnPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const vnpResponse = searchParams.get('vnp_ResponseCode')
  const [polling, setPolling] = useState(true)

  const orderQuery = useMyOrderDetailQuery(id, true, {
    refetchInterval: polling ? POLL_MS : false,
  })

  const order = orderQuery.data

  useEffect(() => {
    const timer = window.setTimeout(() => setPolling(false), POLL_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (order?.payment_status === 'paid' || order?.status === 'cancelled') {
      setPolling(false)
    }
  }, [order?.payment_status, order?.status])

  if (orderQuery.isLoading && !order) {
    return (
      <PageShell title="Xác nhận thanh toán">
        <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
      </PageShell>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <PageShell title="Xác nhận thanh toán">
        <p className="text-sm text-danger-700">{getErrorMessage(orderQuery.error)}</p>
      </PageShell>
    )
  }

  const paid = order.payment_status === 'paid'
  const cancelled = order.status === 'cancelled'

  return (
    <PageShell title="Kết quả thanh toán">
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-surface-raised p-6">
        {paid ? (
          <>
            <p className="text-center text-lg font-semibold text-success-700">Thanh toán thành công</p>
            <div className="flex justify-center">
              <OrderStatusBadge status={order.status} paymentStatus={order.payment_status} />
            </div>
          </>
        ) : cancelled ? (
          <p className="text-center text-foreground-muted">
            Đơn đã bị hủy (quá hạn thanh toán hoặc đã hủy trước đó).
          </p>
        ) : (
          <>
            <p className="text-center text-foreground-muted">
              {vnpResponse === '00'
                ? 'VNPay báo thành công — đang xác nhận với hệ thống…'
                : 'Đang chờ xác nhận thanh toán từ VNPay…'}
            </p>
            {polling ? (
              <p className="text-center text-xs text-foreground-subtle">Tự động cập nhật mỗi vài giây</p>
            ) : (
              <p className="text-center text-sm text-warning-700">
                Chưa nhận được xác nhận. Nếu đã trừ tiền, vui lòng liên hệ hỗ trợ với mã đơn{' '}
                <span className="font-mono">{order.id}</span>.
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to={`/orders/${id}`}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
          >
            Chi tiết đơn
          </Link>
          {!paid && !cancelled ? (
            <Link
              to={`/orders/${id}/pay`}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
            >
              Thanh toán lại
            </Link>
          ) : null}
        </div>
      </div>
    </PageShell>
  )
}
