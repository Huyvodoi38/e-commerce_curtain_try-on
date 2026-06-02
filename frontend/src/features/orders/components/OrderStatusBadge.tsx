import { Badge } from '@/components/ui/Badge'
import type { OrderStatus, PaymentStatus } from '@/features/orders/types'
import {
  fulfillmentStatusLabel,
  fulfillmentStatusTone,
  paymentStatusLabel,
  paymentStatusToneFor,
} from '@/lib/orders/statusLabels'

type Props = {
  status: OrderStatus
  paymentStatus: PaymentStatus
  showPayment?: boolean
}

export function OrderStatusBadge({ status, paymentStatus, showPayment = true }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone={fulfillmentStatusTone(status, paymentStatus)}>
        {fulfillmentStatusLabel(status, paymentStatus)}
      </Badge>
      {showPayment ? (
        <Badge tone={paymentStatusToneFor(paymentStatus)}>{paymentStatusLabel(paymentStatus)}</Badge>
      ) : null}
    </div>
  )
}
