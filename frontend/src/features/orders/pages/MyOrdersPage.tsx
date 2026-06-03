import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { Pagination, resolveTotalPages } from '@/components/common/Pagination'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { useMyOrdersQuery } from '@/features/orders/hooks'
import type { OrderStatus } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import { offlineSubtypeLabel } from '@/lib/orders/statusLabels'
import { formatVnd } from '@/lib/utils/formatCurrency'

const STATUS_FILTERS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MyOrdersPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'' | OrderStatus>('')
  const pageSize = 10

  const ordersQuery = useMyOrdersQuery({
    page,
    page_size: pageSize,
    status: statusFilter || undefined,
  })

  const data = ordersQuery.data
  const totalPages = resolveTotalPages(data?.total ?? 0, pageSize)

  return (
    <PageShell title="Đơn hàng của tôi" description="Theo dõi trạng thái đơn và thanh toán">
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => {
              setStatusFilter(f.value)
              setPage(1)
            }}
            className={`rounded-full px-3 py-1.5 text-sm ${
              statusFilter === f.value
                ? 'bg-brand text-on-brand'
                : 'bg-surface-muted text-foreground-muted hover:bg-surface-raised'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : null}

      {ordersQuery.isError ? (
        <div className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          Không tải được đơn hàng: {getErrorMessage(ordersQuery.error)}
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
          <p className="text-foreground-muted">Bạn chưa có đơn hàng nào.</p>
          <Link to="/products" className="mt-4 inline-block text-brand hover:underline">
            Mua sắm ngay
          </Link>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <ul className="space-y-3">
          {data.items.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="block rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-brand/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-foreground-muted">#{order.id.slice(-8)}</p>
                    <p className="mt-1 text-sm text-foreground-subtle">{formatOrderDate(order.created_at)}</p>
                  </div>
                  <OrderStatusBadge status={order.status} paymentStatus={order.payment_status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-foreground-muted">
                    {order.item_count} sản phẩm · {offlineSubtypeLabel(order.offline_subtype)}
                  </span>
                  <span className="font-semibold text-brand">{formatVnd(order.total_amount)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {data ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang đơn hàng"
        />
      ) : null}
    </PageShell>
  )
}
