import type { ComponentType } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  IconAdminHome,
  IconCategories,
  IconChartBar,
  IconCustomers,
  IconLogout,
  IconOrders,
  IconProducts,
  IconPromotions,
  IconStaff,
  IconSystemLogs,
} from '@/components/layout/adminNavIcons'
import { useLogoutMutation, useMeQuery } from '@/features/auth/hooks'
import {
  canAccessAdmin,
  canManageCustomers,
  canManageOrders,
  canManagePromotions,
  canManageStaff,
  canViewAdminCategories,
  canViewAdminProducts,
  canViewSystemAuditLogs,
} from '@/lib/permissions/permissions'
import type { UserRole } from '@/types/auth'

type NavIcon = ComponentType<{ className?: string }>

type NavItem = {
  to: string
  label: string
  Icon: NavIcon
  visible: (role: UserRole) => boolean
}

function isNavActive(path: string, pathname: string): boolean {
  if (path === '/admin') return pathname === '/admin'
  return pathname.startsWith(path)
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Trang chủ', Icon: IconAdminHome, visible: canAccessAdmin },
  { to: '/admin/stats', label: 'Thống kê', Icon: IconChartBar, visible: canAccessAdmin },
  { to: '/admin/orders', label: 'Đơn hàng', Icon: IconOrders, visible: canManageOrders },
  { to: '/admin/products', label: 'Sản phẩm', Icon: IconProducts, visible: canViewAdminProducts },
  { to: '/admin/categories', label: 'Danh mục', Icon: IconCategories, visible: canViewAdminCategories },
  { to: '/admin/promotions', label: 'Khuyến mãi', Icon: IconPromotions, visible: canManagePromotions },
  { to: '/admin/customers', label: 'Khách hàng', Icon: IconCustomers, visible: canManageCustomers },
  { to: '/admin/staff', label: 'Nhân viên', Icon: IconStaff, visible: canManageStaff },
  { to: '/admin/logs', label: 'Nhật ký hệ thống', Icon: IconSystemLogs, visible: canViewSystemAuditLogs },
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
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface-raised p-4">
        <Link
          to="/admin"
          className="mb-6 flex shrink-0 items-center gap-2 text-lg font-semibold text-brand"
        >
          <IconAdminHome className="h-5 w-5" />
          Admin
        </Link>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {navItems
            .filter((item) => (role ? item.visible(role) : false))
            .map((item) => {
              const active = isNavActive(item.to, location.pathname)
              const { Icon } = item
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-brand-subtle font-medium text-brand'
                      : 'text-foreground-muted hover:bg-surface'
                  }`}
                >
                  <Icon />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              )
            })}
        </nav>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={logoutMutation.isPending}
          className="mt-4 flex shrink-0 items-center gap-2.5 text-sm text-foreground-subtle hover:text-brand disabled:opacity-50"
        >
          <IconLogout />
          Đăng xuất
        </button>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
