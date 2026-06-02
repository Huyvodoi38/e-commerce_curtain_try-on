import type { ShippingAddress } from '@/features/orders/types'
import { isTwoTierDistrict } from '@/lib/vietnam-admin/constants'

/** Hiển thị địa chỉ giao hàng (ẩn cấp quận/huyện khi dùng mô hình 2 cấp). */
export function formatShippingAddress(addr: ShippingAddress): string {
  const parts = [addr.line1, addr.ward]
  if (!isTwoTierDistrict(addr.district)) {
    parts.push(addr.district)
  }
  parts.push(addr.city)
  return parts.join(', ')
}
