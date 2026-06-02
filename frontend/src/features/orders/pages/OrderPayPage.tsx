import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { useCreateVnpayPaymentMutation, useMyOrderDetailQuery } from '@/features/orders/hooks'
import type { VnpayPaymentInfo } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import { formatVnd } from '@/lib/utils/formatCurrency'

type PayLocationState = {
  vnpay?: VnpayPaymentInfo
}

export function OrderPayPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const redirected = useRef(false)
  const state = (location.state as PayLocationState | null)?.vnpay
  const [payInfo, setPayInfo] = useState<VnpayPaymentInfo | null>(state ?? null)

  const orderQuery = useMyOrderDetailQuery(id)
  const retryMutation = useCreateVnpayPaymentMutation(id)

  const order = orderQuery.data

  useEffect(() => {
    if (!order) return
    if (order.payment_status === 'paid') {
      navigate(`/orders/${id}`, { replace: true })
      return
    }
    if (order.status === 'cancelled') {
      return
    }
    if (payInfo?.payment_url && !redirected.current) {
      redirected.current = true
      window.location.href = payInfo.payment_url
    }
  }, [order, payInfo, id, navigate])

  async function handleRetryPay() {
    try {
      const info = await retryMutation.mutateAsync()
      setPayInfo(info)
      redirected.current = false
    } catch {
      // error below
    }
  }

  if (orderQuery.isLoading) {
    return (
      <PageShell title="Thanh toán VNPay">
        <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
      </PageShell>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <PageShell title="Thanh toán VNPay">
        <p className="text-sm text-danger-700">{getErrorMessage(orderQuery.error)}</p>
      </PageShell>
    )
  }

  if (order.status === 'cancelled') {
    return (
      <PageShell title="Đơn đã hủy">
        <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
          <p className="text-foreground-muted">
            Đơn hàng đã bị hủy (có thể do quá 15 phút chưa thanh toán).
          </p>
          <Link to="/products" className="mt-4 inline-block text-brand hover:underline">
            Đặt hàng lại
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Thanh toán VNPay" description={`Đơn #${order.id.slice(-8)}`}>
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-surface-raised p-6 text-center">
        <p className="text-lg font-semibold text-brand">{formatVnd(order.total_amount)}</p>
        <p className="text-sm text-foreground-muted">
          Đang chuyển bạn sang cổng VNPay để quét mã QR…
        </p>
        <p className="text-xs text-foreground-subtle">
          Mã QR có hiệu lực 15 phút. Nếu không tự chuyển trang, bấm nút bên dưới.
        </p>

        {payInfo ? (
          <a
            href={payInfo.payment_url}
            className="inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover"
          >
            Mở trang thanh toán VNPay
          </a>
        ) : (
          <button
            type="button"
            disabled={retryMutation.isPending}
            onClick={() => void handleRetryPay()}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {retryMutation.isPending ? 'Đang tạo link…' : 'Tạo link thanh toán'}
          </button>
        )}

        {retryMutation.isError ? (
          <p className="text-sm text-danger-700">{getErrorMessage(retryMutation.error)}</p>
        ) : null}

        <Link to={`/orders/${id}`} className="block text-sm text-foreground-muted hover:text-brand">
          Xem chi tiết đơn
        </Link>
      </div>
    </PageShell>
  )
}
