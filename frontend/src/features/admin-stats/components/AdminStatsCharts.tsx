import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AdminStats } from '@/features/admin-stats/types'
import { orderStatusLabel } from '@/lib/orders/statusLabels'
import { formatVnd } from '@/lib/utils/formatCurrency'
import type { OrderStatus } from '@/features/orders/types'

const STATUS_ORDER: OrderStatus[] = ['pending', 'shipped', 'delivered', 'cancelled']

const STATUS_FILL: Record<OrderStatus, string> = {
  pending: '#64748b',
  shipped: '#4f46e5',
  delivered: '#047857',
  cancelled: '#b91c1c',
}

const CHART = {
  brand: '#4f46e5',
  brandLight: '#818cf8',
  grid: '#e2e8f0',
  muted: '#64748b',
} as const

function formatDayShort(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${d}/${m}`
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-4">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-64 items-center justify-center text-sm text-foreground-muted">{message}</p>
  )
}

type TooltipPayload = { value?: number; name?: string; color?: string }

function OrdersRevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const orders = payload.find((p) => p.name === 'Số đơn')?.value ?? 0
  const revenue = payload.find((p) => p.name === 'Doanh thu')?.value ?? 0
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 text-foreground-muted">Số đơn: {orders}</p>
      <p className="text-brand">Doanh thu: {formatVnd(revenue)}</p>
    </div>
  )
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name?: string; value?: number }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-foreground-muted">{item.value} đơn</p>
    </div>
  )
}

type Props = {
  stats: AdminStats
  showManagerCharts: boolean
}

export function AdminStatsCharts({ stats, showManagerCharts }: Props) {
  const dayData = stats.by_day.map((row) => ({
    date: row.date,
    label: formatDayShort(row.date),
    orders: row.order_count,
    revenue: row.revenue,
  }))

  const statusData = STATUS_ORDER.map((status) => ({
    name: orderStatusLabel(status),
    value: stats.by_status.find((r) => r.status === status)?.count ?? 0,
    fill: STATUS_FILL[status],
  })).filter((row) => row.value > 0)

  const paymentData = [
    { name: 'Đã thanh toán', value: stats.payment_paid, fill: '#047857' },
    { name: 'Chưa thanh toán', value: stats.payment_unpaid, fill: '#b45309' },
  ].filter((row) => row.value > 0)

  const methodData =
    showManagerCharts && stats.payment_offline != null && stats.payment_vnpay != null
      ? [
          { name: 'Offline', value: stats.payment_offline, fill: CHART.brand },
          { name: 'VNPay', value: stats.payment_vnpay, fill: CHART.brandLight },
        ].filter((row) => row.value > 0)
      : []

  const hasDayData = dayData.length > 0
  const hasStatusData = statusData.length > 0
  const hasPaymentData = paymentData.length > 0

  return (
    <div className="space-y-6">
      <ChartCard title="Đơn hàng & doanh thu theo ngày">
        {hasDayData ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={dayData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.muted, fontSize: 12 }}
                axisLine={{ stroke: CHART.grid }}
                tickLine={false}
              />
              <YAxis
                yAxisId="orders"
                allowDecimals={false}
                tick={{ fill: CHART.muted, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fill: CHART.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(v) =>
                  v >= 1_000_000 ? `${Math.round(v / 1_000_000)}tr` : `${Math.round(v / 1000)}k`
                }
              />
              <Tooltip content={<OrdersRevenueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="orders"
                dataKey="orders"
                name="Số đơn"
                fill={CHART.brand}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#047857"
                strokeWidth={2}
                dot={{ r: 3, fill: '#047857' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Không có dữ liệu theo ngày trong khoảng đã chọn." />
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Theo trạng thái giao hàng">
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: CHART.muted, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: CHART.muted, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
                  formatter={(value) => [`${Number(value ?? 0)} đơn`, 'Số lượng']}
                />
                <Bar dataKey="value" name="Số đơn" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Không có đơn theo trạng thái." />
          )}
        </ChartCard>

        <ChartCard title="Thanh toán">
          {hasPaymentData ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={96}
                  paddingAngle={2}
                >
                  {paymentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Không có dữ liệu thanh toán." />
          )}
        </ChartCard>
      </div>

      {methodData.length > 0 ? (
        <ChartCard title="Phương thức thanh toán (quản lý)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={methodData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
              >
                {methodData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </div>
  )
}
