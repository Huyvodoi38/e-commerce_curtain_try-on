import { Link } from 'react-router-dom'
import type { OrderItemPublic } from '@/features/orders/types'
import { formatVnd } from '@/lib/utils/formatCurrency'

type Props = {
  items: OrderItemPublic[]
}

export function OrderItemsList({ items }: Props) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface-raised">
      {items.map((item) => (
        <li key={item.product_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <div>
            <Link to={`/products/${item.product_id}`} className="font-medium text-foreground hover:text-brand">
              {item.product_name}
            </Link>
            <p className="text-foreground-muted">
              {item.quantity} × {formatVnd(item.unit_price)}
            </p>
          </div>
          <span className="font-medium text-brand">{formatVnd(item.line_total)}</span>
        </li>
      ))}
    </ul>
  )
}
