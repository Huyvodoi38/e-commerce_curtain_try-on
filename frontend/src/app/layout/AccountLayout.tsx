import { Link, Outlet, useLocation } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/account', label: 'Tổng quan', end: true },
  { to: '/account/profile', label: 'Hồ sơ' },
  { to: '/account/security', label: 'Bảo mật' },
  { to: '/account/orders', label: 'Đơn hàng' },
  { to: '/account/try-on', label: 'Lịch sử Try-on' },
]

function isNavActive(path: string, pathname: string, end?: boolean): boolean {
  if (end) return pathname === path
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function AccountLayout() {
  const location = useLocation()
  const meQuery = useMeQuery()
  const displayName = meQuery.data?.full_name || meQuery.data?.username || 'Tài khoản'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-sm font-medium text-brand">Quản lý tài khoản</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{displayName}</h1>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <nav
          aria-label="Menu tài khoản"
          className="flex gap-2 overflow-x-auto pb-1 lg:w-52 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {navItems.map((item) => {
            const active = isNavActive(item.to, location.pathname, item.end)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded-md px-3 py-2 text-sm ${
                  active
                    ? 'bg-brand-subtle font-medium text-brand'
                    : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
