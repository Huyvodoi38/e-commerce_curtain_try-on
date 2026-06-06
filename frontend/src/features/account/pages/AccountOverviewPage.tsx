import { Link } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'
import { useMyOrdersQuery } from '@/features/orders/hooks'
import { useTryOnHistoryQuery } from '@/features/try-on/hooks'

function authProviderLabel(provider: string | undefined): string {
  if (provider === 'google') return 'Google'
  if (provider === 'local') return 'Tên đăng nhập'
  return '—'
}

export function AccountOverviewPage() {
  const meQuery = useMeQuery()
  const pendingOrdersQuery = useMyOrdersQuery({ page: 1, page_size: 1, status: 'pending' })
  const tryOnQuery = useTryOnHistoryQuery(1, 1)

  const user = meQuery.data
  const pendingCount = pendingOrdersQuery.data?.total ?? 0
  const tryOnCount = tryOnQuery.data?.total ?? 0

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-foreground">Thông tin nhanh</h2>
        {meQuery.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-lg bg-surface-muted" />
        ) : user ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-foreground-subtle">Họ tên</dt>
              <dd className="font-medium text-foreground">{user.full_name}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Đăng nhập bằng</dt>
              <dd className="font-medium text-foreground">{authProviderLabel(user.auth_provider)}</dd>
            </div>
            {user.username ? (
              <div>
                <dt className="text-foreground-subtle">Tên đăng nhập</dt>
                <dd className="font-medium text-foreground">{user.username}</dd>
              </div>
            ) : null}
            {user.email ? (
              <div>
                <dt className="text-foreground-subtle">Email</dt>
                <dd className="font-medium text-foreground">{user.email}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <Link
          to="/account/profile"
          className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
        >
          Chỉnh sửa hồ sơ →
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <OverviewCard
          title="Đơn chờ xử lý"
          value={pendingOrdersQuery.isLoading ? '…' : String(pendingCount)}
          description="Đơn hàng đang chờ shop xử lý"
          to="/account/orders"
          linkLabel="Xem đơn hàng"
        />
        <OverviewCard
          title="Try-on đã lưu"
          value={tryOnQuery.isLoading ? '…' : String(tryOnCount)}
          description="Kết quả thử rèm AI trên ảnh phòng"
          to="/account/try-on"
          linkLabel="Xem lịch sử"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/products"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
        >
          Tiếp tục mua sắm
        </Link>
        <Link
          to="/cart"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
        >
          Giỏ hàng
        </Link>
      </div>
    </div>
  )
}

function OverviewCard({
  title,
  value,
  description,
  to,
  linkLabel,
}: {
  title: string
  value: string
  description: string
  to: string
  linkLabel: string
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-5">
      <p className="text-sm text-foreground-muted">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-brand">{value}</p>
      <p className="mt-2 text-sm text-foreground-subtle">{description}</p>
      <Link to={to} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
        {linkLabel} →
      </Link>
    </article>
  )
}
