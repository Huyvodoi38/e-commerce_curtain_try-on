import { PageShell } from '@/components/common/PageShell'
import { AdminStatsCharts } from '@/features/admin-stats/components/AdminStatsCharts'
import { useState } from 'react'
import { useMeQuery } from '@/features/auth/hooks'
import { useAdminStatsQuery } from '@/features/admin-stats/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { isManager } from '@/lib/permissions/permissions'
import { formatVnd } from '@/lib/utils/formatCurrency'

function cancelledCount(
  byStatus: { status: string; count: number }[] | undefined,
): number {
  return byStatus?.find((r) => r.status === 'cancelled')?.count ?? 0
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export function AdminStatsPage() {
  const meQuery = useMeQuery()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)
  const manager = isManager(meQuery.data?.role ?? 'customer')

  const statsQuery = useAdminStatsQuery(
    {
      from: !dateRangeInvalid && dateFrom ? dateFrom : undefined,
      to: !dateRangeInvalid && dateTo ? dateTo : undefined,
    },
    !dateRangeInvalid,
  )

  const showManagerCharts =
    manager &&
    (statsQuery.data?.customers_new != null ||
      statsQuery.data?.products_low_stock != null ||
      statsQuery.data?.payment_offline != null)

  return (
    <PageShell title="Thống kê">
      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface-raised p-4">
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setDateFrom('')
            setDateTo('')
          }}
          className="rounded-md border border-border px-3 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
        >
          Xóa khoảng ngày
        </button>
        {dateRangeInvalid ? (
          <p className="pb-2 text-sm text-danger-700">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>
        ) : null}
      </div>

      {statsQuery.isLoading ? <div className="h-48 animate-pulse rounded-xl bg-surface-muted" /> : null}
      {statsQuery.isError ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          {getErrorMessage(statsQuery.error)}
        </p>
      ) : null}

      {statsQuery.data ? (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Tổng đơn" value={String(statsQuery.data.orders_total)} />
            <KpiCard
              label="Đã hủy"
              value={String(cancelledCount(statsQuery.data.by_status))}
            />
            <KpiCard label="Doanh thu" value={formatVnd(statsQuery.data.revenue_total)} />
            <KpiCard label="Chưa thanh toán" value={String(statsQuery.data.payment_unpaid)} />
            <KpiCard label="Đã thanh toán" value={String(statsQuery.data.payment_paid)} />
          </div>

          {showManagerCharts ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Quản lý</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {statsQuery.data.customers_new != null ? (
                  <KpiCard
                    label="Khách mới (kỳ)"
                    value={String(statsQuery.data.customers_new)}
                  />
                ) : null}
                {statsQuery.data.products_low_stock != null ? (
                  <KpiCard
                    label="SP sắp hết hàng"
                    value={String(statsQuery.data.products_low_stock)}
                  />
                ) : null}
                {statsQuery.data.payment_offline != null ? (
                  <KpiCard label="Đơn offline" value={String(statsQuery.data.payment_offline)} />
                ) : null}
                {statsQuery.data.payment_vnpay != null ? (
                  <KpiCard label="Đơn VNPay" value={String(statsQuery.data.payment_vnpay)} />
                ) : null}
              </div>
            </section>
          ) : null}

          <AdminStatsCharts stats={statsQuery.data} showManagerCharts={showManagerCharts} />

          {statsQuery.data.by_day.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Chi tiết theo ngày</h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-muted text-foreground-muted">
                    <tr>
                      <th className="px-4 py-3">Ngày</th>
                      <th className="px-4 py-3">Số đơn</th>
                      <th className="px-4 py-3">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsQuery.data.by_day.map((row) => (
                      <tr key={row.date} className="border-t border-border">
                        <td className="px-4 py-3">{formatDayLabel(row.date)}</td>
                        <td className="px-4 py-3">{row.order_count}</td>
                        <td className="px-4 py-3 font-medium text-brand">
                          {formatVnd(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  )
}
