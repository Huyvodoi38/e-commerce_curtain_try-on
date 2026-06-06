const items = [
  {
    title: 'Thử rèm AI',
    description: 'Upload ảnh phòng, chọn vùng cửa sổ và xem rèm hiển thị trực tiếp trước khi đặt hàng.',
  },
  {
    title: 'Đa dạng mẫu rèm',
    description: 'Voan, blackout, rèm phòng khách — nhiều màu sắc và chất liệu phù hợp mọi không gian.',
  },
  {
    title: 'Mua hàng tiện lợi',
    description: 'Thanh toán COD hoặc chuyển khoản, theo dõi đơn hàng và đánh giá sản phẩm sau khi nhận.',
  },
] as const

export function HomeUspStrip() {
  return (
    <section
      className="rounded-2xl border border-border-subtle bg-surface-muted/50 px-5 py-8 sm:px-8"
      aria-labelledby="home-usp-heading"
    >
      <h2 id="home-usp-heading" className="sr-only">
        Vì sao chọn Quang Huy Shop
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="space-y-2">
            <h3 className="font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm leading-relaxed text-foreground-muted">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
