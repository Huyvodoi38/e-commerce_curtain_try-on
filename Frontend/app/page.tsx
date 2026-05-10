import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-100 to-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-brand-500">
              Rèm cửa cao cấp · AI Try-on
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold leading-tight text-brand-800">
              Xem trước mẫu rèm phù hợp với{" "}
              <span className="text-brand-600">không gian thật</span> của bạn.
            </h1>
            <p className="mt-6 text-lg text-brand-700/80">
              Tải ảnh phòng của bạn lên, chọn mẫu rèm yêu thích và để AI
              hiển thị kết quả trong vài giây.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/tryon"
                className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Thử ngay với AI
              </Link>
              <Link
                href="/products"
                className="rounded-full border border-brand-300 px-6 py-3 font-medium text-brand-700 transition hover:bg-brand-100"
              >
                Xem bộ sưu tập
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-brand-200/60 shadow-lg">
            {/* Ảnh placeholder, có thể thay bằng next/image sau */}
            <div className="flex h-full w-full items-center justify-center text-brand-700/60">
              <span className="text-sm">[Ảnh hero – mẫu rèm cao cấp]</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tính năng */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-brand-800">
          Vì sao chọn Rèm AI?
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "AI Try-on chính xác",
              desc: "Sử dụng SAM + Stable Diffusion để tạo ảnh rèm bám sát khung cửa của bạn.",
            },
            {
              title: "Chất liệu cao cấp",
              desc: "Linen, cotton, blackout… đa dạng tone màu cho mọi phong cách.",
            },
            {
              title: "Đặt hàng dễ dàng",
              desc: "Đặt online, đo và lắp đặt tận nơi tại Hà Nội & TP.HCM.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-brand-200/60 bg-white/60 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-brand-700">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-brand-700/80">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
