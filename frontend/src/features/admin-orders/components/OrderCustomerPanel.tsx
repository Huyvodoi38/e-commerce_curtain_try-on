import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { customerLogsPath } from '@/features/users/customerLogsNav'
import { useUserDetailQuery } from '@/features/users/hooks'
import { formatDateTimeVi, formatUserLogin } from '@/features/users/userDisplay'
import { getErrorMessage } from '@/lib/api/client'
import type { ShippingAddress } from '@/features/orders/types'

type OrderCustomerPanelProps = {
  userId: string
  orderId: string
  shippingAddress: ShippingAddress
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

export function OrderCustomerPanel({ userId, orderId, shippingAddress }: OrderCustomerPanelProps) {
  const userQuery = useUserDetailQuery(userId, Boolean(userId))

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface-raised p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-foreground">Khách hàng</h2>
        <Link
          to={customerLogsPath(userId, { from: 'order', orderId })}
          className="text-brand hover:underline"
        >
          Xem nhật ký →
        </Link>
      </div>

      {userQuery.isLoading ? (
        <div className="mt-3 h-20 animate-pulse rounded-lg bg-surface-muted" />
      ) : null}

      {userQuery.isError ? (
        <p className="mt-3 text-danger-700">{getErrorMessage(userQuery.error)}</p>
      ) : null}

      {userQuery.data ? (
        <dl className="mt-3 space-y-2">
          <DetailRow label="Họ tên">{userQuery.data.full_name}</DetailRow>
          <DetailRow label="Tên đăng nhập">{formatUserLogin(userQuery.data.username, userQuery.data.email)}</DetailRow>
          {userQuery.data.email ? (
            <DetailRow label="Email">{userQuery.data.email}</DetailRow>
          ) : null}
          <DetailRow label="Trạng thái">
            {userQuery.data.is_active ? (
              <span className="text-success-700">Đang hoạt động</span>
            ) : (
              <span className="text-danger-700">Đã vô hiệu hóa</span>
            )}
          </DetailRow>
          <DetailRow label="Đăng ký">{formatDateTimeVi(userQuery.data.created_at)}</DetailRow>
          <DetailRow label="Mã khách hàng">
            <span className="font-mono text-xs">{userQuery.data.id}</span>
          </DetailRow>
        </dl>
      ) : (
        <p className="mt-3 font-mono text-xs text-foreground-subtle">Mã khách hàng: {userId}</p>
      )}

      <div className="mt-4 rounded-lg border border-border-subtle bg-surface-muted/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Người nhận trên đơn
        </p>
        <p className="mt-1 font-medium text-foreground">{shippingAddress.full_name}</p>
        <p className="text-foreground-muted">{shippingAddress.phone}</p>
        {userQuery.data &&
        userQuery.data.full_name.trim() !== shippingAddress.full_name.trim() ? (
          <p className="mt-2 text-xs text-foreground-subtle">
            Khác tên tài khoản ({userQuery.data.full_name})
          </p>
        ) : null}
      </div>
    </section>
  )
}
