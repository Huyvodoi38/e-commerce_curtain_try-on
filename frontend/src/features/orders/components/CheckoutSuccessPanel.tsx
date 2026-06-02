import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { BankInstructionsCard } from '@/features/orders/components/BankInstructionsCard'
import { OrderItemsList } from '@/features/orders/components/OrderItemsList'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import type { BankInstructions, OrderDetail } from '@/features/orders/types'
import { offlineSubtypeLabel } from '@/lib/orders/statusLabels'
import { formatVnd } from '@/lib/utils/formatCurrency'
import { saveBankInstructions } from '@/lib/orders/bankInstructionsStore'

type Props = {
  order: OrderDetail
  bankInstructions: BankInstructions | null
}

export function CheckoutSuccessPanel({ order, bankInstructions }: Props) {
  useEffect(() => {
    if (bankInstructions) {
      saveBankInstructions(bankInstructions)
    }
  }, [bankInstructions])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-success-700/20 bg-success-50 p-5">
        <h2 className="text-lg font-semibold text-success-700">Đặt hàng thành công</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Mã đơn: <span className="font-mono font-medium text-foreground">{order.id}</span>
        </p>
        <div className="mt-3">
          <OrderStatusBadge status={order.status} paymentStatus={order.payment_status} />
        </div>
      </div>

      {bankInstructions ? <BankInstructionsCard instructions={bankInstructions} /> : null}

      <section className="space-y-3">
        <h3 className="font-medium text-foreground">Sản phẩm</h3>
        <OrderItemsList items={order.items} />
      </section>

      <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm">
        <p className="text-foreground-muted">
          Phương thức: {offlineSubtypeLabel(order.offline_subtype)}
        </p>
        {order.discount_amount > 0 ? (
          <p className="mt-2 text-foreground-muted">
            Giảm giá: −{formatVnd(order.discount_amount)}
            {order.promotion_code ? ` (${order.promotion_code})` : ''}
          </p>
        ) : null}
        <p className="mt-2 text-lg font-semibold text-brand">Tổng: {formatVnd(order.total_amount)}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to={`/orders/${order.id}`}
          state={{ bankInstructions }}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover"
        >
          Xem chi tiết đơn
        </Link>
        <Link
          to="/orders"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
        >
          Đơn hàng của tôi
        </Link>
      </div>
    </div>
  )
}
