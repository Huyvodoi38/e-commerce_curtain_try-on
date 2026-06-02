import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { useMyOrderDetailQuery } from '@/features/orders/hooks'
import { getErrorMessage } from '@/lib/api/client'

const POLL_MS = 3000
const POLL_MAX_MS = 15 * 60 * 1000
const VNPAY_SUCCESS_CODE = '00'

const VNPAY_RESPONSE_MESSAGES: Record<string, string> = {
  '07': 'Giao dịch thành công nhưng bị nghi ngờ rủi ro. Vui lòng liên hệ hỗ trợ để được xác minh.',
  '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking.',
  '10': 'Nhập thông tin thẻ/tài khoản sai quá số lần cho phép.',
  '11': 'Giao dịch đã hết hạn chờ thanh toán.',
  '12': 'Thẻ/Tài khoản đang bị khóa.',
  '13': 'Sai mã OTP xác thực giao dịch.',
  '24': 'Bạn đã hủy giao dịch thanh toán.',
  '51': 'Tài khoản không đủ số dư để thanh toán.',
  '65': 'Tài khoản đã vượt hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Lỗi khác từ cổng thanh toán.',
}

function getVnpayFailureMessage(code: string | null): string | null {
  if (!code || code === VNPAY_SUCCESS_CODE) return null
  return VNPAY_RESPONSE_MESSAGES[code] ?? `Giao dịch không thành công (mã lỗi ${code}).`
}

export function OrderPayReturnPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const vnpResponse = searchParams.get('vnp_ResponseCode')
  const vnpFailMessage = getVnpayFailureMessage(vnpResponse)
  const [deadlineReached, setDeadlineReached] = useState(false)
  const [stoppedByStatus, setStoppedByStatus] = useState(false)
  const polling = !deadlineReached && !stoppedByStatus && !vnpFailMessage

  const orderQuery = useMyOrderDetailQuery(id, true, {
    refetchInterval: polling ? POLL_MS : false,
  })

  const order = orderQuery.data
  const paid = order?.payment_status === 'paid'
  const cancelled = order?.status === 'cancelled'

  useEffect(() => {
    const timer = window.setTimeout(() => setDeadlineReached(true), POLL_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!order) return
    if (order.payment_status === 'paid' || order.status === 'cancelled') {
      const timer = window.setTimeout(() => setStoppedByStatus(true), 0)
      return () => window.clearTimeout(timer)
    }
  }, [order])

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
            <p className={`text-center ${vnpFailMessage ? 'text-danger-700' : 'text-foreground-muted'}`}>
              {vnpResponse === VNPAY_SUCCESS_CODE
                ? 'VNPay báo thành công — đang xác nhận với hệ thống…'
                : vnpFailMessage ?? 'Đang chờ xác nhận thanh toán từ VNPay…'}
            </p>
            {polling ? (
              <p className="text-center text-xs text-foreground-subtle">Tự động cập nhật mỗi vài giây</p>
            ) : (
              <>
                {vnpFailMessage ? (
                  <p className="text-center text-sm text-foreground-muted">
                    Vui lòng thử lại phương thức thanh toán khác hoặc tạo lại link thanh toán.
                  </p>
                ) : (
                  <p className="text-center text-sm text-warning-700">
                    Chưa nhận được xác nhận. Nếu đã trừ tiền, vui lòng liên hệ hỗ trợ với mã đơn{' '}
                    <span className="font-mono">{order.id}</span>.
                  </p>
                )}
              </>
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
