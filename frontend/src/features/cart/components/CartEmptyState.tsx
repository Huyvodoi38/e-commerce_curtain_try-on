import { Link } from 'react-router-dom'

export function CartEmptyState() {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-6 py-12 text-center">
      <p className="text-foreground-muted">Giỏ hàng của bạn đang trống.</p>
      <Link
        to="/products"
        className="mt-4 inline-block rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover"
      >
        Xem sản phẩm
      </Link>
    </div>
  )
}
