import { PageShell } from '@/components/common/PageShell'
import { Link } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'
import { useAdminOverviewQuery } from '@/features/admin-home/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { fulfillmentStatusLabel } from '@/lib/orders/statusLabels'
import {
  canManageCustomers,
  canManageOrders,
  canViewAdminProducts,
} from '@/lib/permissions/permissions'
import { formatVnd } from '@/lib/utils/formatCurrency'

type KpiCardProps = {
  label: string
  value: string
  hint?: string
  to?: string
}

function KpiCard({ label, value, hint, to }: KpiCardProps) {
  const inner = (
    <>
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-subtle">{hint}</p> : null}
    </>
  )
  const className =
    'rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-brand/30'
  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const shortcuts = [
  { to: '/admin/orders', label: 'Đơn hàng', visible: canManageOrders },
  { to: '/admin/products', label: 'Sản phẩm', visible: canViewAdminProducts },
  { to: '/admin/customers', label: 'Khách hàng', visible: canManageCustomers },
  { to: '/admin/stats', label: 'Thống kê', visible: canManageOrders },
] as const

export function AdminHomePage() {
  const meQuery = useMeQuery()
  const overviewQuery = useAdminOverviewQuery()
  const role = meQuery.data?.role

  return (
    <PageShell title="Trang chủ">
      {meQuery.data ? (
        <p className="mb-6 text-sm text-foreground-muted">
          Xin chào, <span className="font-medium text-foreground">{meQuery.data.full_name}</span>
        </p>
      ) : null}
      {overviewQuery.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />
      ) : null}
      {overviewQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(overviewQuery.error)}
        </p>
      ) : null}

      {overviewQuery.data ? (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Hôm nay</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Đơn mới"
                value={String(overviewQuery.data.orders_today)}
                hint="Đơn tạo trong ngày"
                to="/admin/orders"
              />
              <KpiCard
                label="Doanh thu"
                value={formatVnd(overviewQuery.data.revenue_today)}
                hint="Đã thanh toán, không tính đơn hủy"
                to="/admin/stats"
              />
              <KpiCard
                label="Chưa thanh toán"
                value={String(overviewQuery.data.orders_unpaid)}
                hint="Cần xác nhận thanh toán"
                to="/admin/orders"
              />
              <KpiCard
                label="Chờ giao hàng"
                value={String(overviewQuery.data.orders_awaiting_shipment)}
                hint="Đã thanh toán, chờ xử lý giao"
                to="/admin/orders"
              />
            </div>
          </section>

          {role ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Lối tắt</h2>
              <div className="flex flex-wrap gap-2">
                {shortcuts
                  .filter((s) => s.visible(role))
                  .map((s) => (
                    <Link
                      key={s.to}
                      to={s.to}
                      className="rounded-md border border-border bg-surface-raised px-4 py-2 text-sm hover:bg-surface-muted"
                    >
                      {s.label}
                    </Link>
                  ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Đơn gần đây</h2>
              <Link to="/admin/orders" className="text-sm text-brand hover:underline">
                Xem tất cả
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-muted text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Tổng</th>
                    <th className="px-4 py-3">Tạo lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewQuery.data.recent_orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-foreground-muted">
                        Chưa có đơn hàng.
                      </td>
                    </tr>
                  ) : (
                    overviewQuery.data.recent_orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-t border-border transition-colors hover:bg-surface-muted"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="font-mono text-brand hover:underline"
                          >
                            #{order.id.slice(-8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {fulfillmentStatusLabel(order.status, order.payment_status)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-brand">
                          {formatVnd(order.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {formatOrderDate(order.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </PageShell>
  )
}
