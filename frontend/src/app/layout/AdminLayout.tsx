import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLogoutMutation, useMeQuery } from '@/features/auth/hooks'
import {
  canManageCustomers,
  canManageOrders,
  canManagePromotions,
  canManageStaff,
  canViewAdminProducts,
  canViewSystemAuditLogs,
} from '@/lib/permissions/permissions'
import type { UserRole } from '@/types/auth'

type NavItem = {
  to: string
  label: string
  visible: (role: UserRole) => boolean
}

const navItems: NavItem[] = [
  { to: '/admin/orders', label: 'Đơn hàng', visible: canManageOrders },
  { to: '/admin/products', label: 'Sản phẩm', visible: canViewAdminProducts },
  { to: '/admin/promotions', label: 'Khuyến mãi', visible: canManagePromotions },
  { to: '/admin/customers', label: 'Khách hàng', visible: canManageCustomers },
  { to: '/admin/staff', label: 'Nhân viên', visible: canManageStaff },
  { to: '/admin/logs', label: 'Nhật ký hệ thống', visible: canViewSystemAuditLogs },
]

export function AdminLayout() {
  const { data: user } = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role

  async function handleLogout() {
    await logoutMutation.mutateAsync()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-raised p-4">
        <Link to="/admin" className="mb-6 block text-lg font-semibold text-brand">
          Admin
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems
            .filter((item) => (role ? item.visible(role) : false))
            .map((item) => {
              const active = location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-brand-subtle font-medium text-brand'
                      : 'text-foreground-muted hover:bg-surface'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
        </nav>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={logoutMutation.isPending}
          className="mt-3 block text-sm text-foreground-subtle hover:text-brand disabled:opacity-50"
        >
          Đăng xuất
        </button>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
