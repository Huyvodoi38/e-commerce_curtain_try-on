import type { OrderStatus, PaymentStatus } from '@/features/orders/types'
import { orderStatusTone, paymentStatusTone, type StatusTone } from '@/lib/theme/statusColors'

export function paymentStatusLabel(status: PaymentStatus): string {
  return status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'
}

export function orderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Chờ xử lý',
    shipped: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
  }
  return labels[status]
}

/** pending + paid → Chờ giao hàng (FE_SPEC §5.3). */
export function fulfillmentStatusLabel(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): string {
  if (status === 'pending' && paymentStatus === 'paid') {
    return 'Chờ giao hàng'
  }
  return orderStatusLabel(status)
}

export function fulfillmentStatusTone(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): StatusTone {
  if (status === 'cancelled') return orderStatusTone.cancelled
  if (status === 'delivered') return orderStatusTone.delivered
  if (status === 'shipped') return orderStatusTone.shipped
  if (status === 'pending' && paymentStatus === 'paid') return 'brand'
  return orderStatusTone.pending
}

export function paymentStatusToneFor(status: PaymentStatus): StatusTone {
  return paymentStatusTone[status]
}

export function offlineSubtypeLabel(subtype: 'cod' | 'bank'): string {
  return subtype === 'cod' ? 'Thanh toán khi nhận (COD)' : 'Chuyển khoản ngân hàng'
}

export function paymentMethodLabel(method: 'offline' | 'vnpay', offlineSubtype?: 'cod' | 'bank'): string {
  if (method === 'vnpay') return 'VNPay QR'
  return offlineSubtype ? offlineSubtypeLabel(offlineSubtype) : 'Thanh toán offline'
}

export function canCustomerCancelOrder(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return status === 'pending' && paymentStatus === 'unpaid'
}
