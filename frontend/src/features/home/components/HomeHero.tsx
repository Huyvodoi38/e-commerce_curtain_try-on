import { Link } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'

export function HomeHero() {
  const meQuery = useMeQuery()
  const isCustomer = meQuery.data?.role === 'customer'

  return (
    <section className="border-b border-border-subtle bg-gradient-to-br from-brand-subtle via-surface-raised to-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-brand">Quang Huy Shop</p>
          <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Rèm cửa đẹp — Thử AI trước khi mua
          </h1>
          <p className="text-base leading-relaxed text-foreground-muted">
            Khám phá hàng trăm mẫu rèm voan, blackout, phòng khách… Upload ảnh phòng và xem rèm hiển thị trực tiếp
            với công nghệ AI.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/products"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover"
            >
              Khám phá sản phẩm
            </Link>
            {isCustomer ? (
              <Link
                to="/account/try-on"
                className="rounded-md border border-brand px-5 py-2.5 text-sm font-medium text-brand hover:bg-brand-subtle"
              >
                Thử rèm của tôi
              </Link>
            ) : (
              <Link
                to="/register"
                className="rounded-md border border-brand px-5 py-2.5 text-sm font-medium text-brand hover:bg-brand-subtle"
              >
                Đăng ký miễn phí
              </Link>
            )}
          </div>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-3 lg:shrink-0">
          <HeroStat label="Thử rèm AI" value="Trực tiếp trên ảnh phòng" />
          <HeroStat label="Đa dạng mẫu" value="Voan, blackout, phòng ngủ" />
          <HeroStat label="Thanh toán" value="COD / chuyển khoản" />
          <HeroStat label="Đánh giá" value="Từ khách hàng thật" />
        </div>
      </div>
    </section>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface-raised/90 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-medium text-brand">{label}</p>
      <p className="mt-1 text-sm text-foreground-muted">{value}</p>
    </div>
  )
}
