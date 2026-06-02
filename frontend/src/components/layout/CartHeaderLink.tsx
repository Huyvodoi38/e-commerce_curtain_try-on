import { Link } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'
import { useIsLoggedIn } from '@/lib/auth/tokenStore'
import { useCartQuery } from '@/features/cart/hooks'
import { loginPathWithRedirect } from '@/lib/auth/paths'

function formatBadgeCount(count: number): string {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

export function CartHeaderLink() {
  const isLoggedIn = useIsLoggedIn()
  const { data: user } = useMeQuery()
  const isCustomer = isLoggedIn && user?.role === 'customer'
  const { data: cart } = useCartQuery(isCustomer)
  const badge = formatBadgeCount(cart?.item_count ?? 0)

  if (!isLoggedIn || !user) {
    return (
      <Link
        to={loginPathWithRedirect('/cart')}
        className="relative rounded-md p-2 text-foreground-muted hover:bg-surface-muted"
        aria-label="Giỏ hàng — đăng nhập để xem"
      >
        <CartIcon />
      </Link>
    )
  }

  return (
    <Link
      to="/cart"
      className="relative rounded-md p-2 text-foreground-muted hover:bg-surface-muted"
      aria-label={badge ? `Giỏ hàng, ${badge} sản phẩm` : 'Giỏ hàng'}
    >
      <CartIcon />
      {isCustomer && badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-on-brand">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

function CartIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-1.5 7h11M10 17a1 1 0 102 0 1 1 0 00-2 0zm8 0a1 1 0 102 0 1 1 0 00-2 0z"
      />
    </svg>
  )
}
