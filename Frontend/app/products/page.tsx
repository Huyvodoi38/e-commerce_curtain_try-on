import Link from "next/link";

import { fetchProducts, type Product } from "@/lib/api";

export const metadata = {
  title: "Bộ sưu tập rèm | Rèm AI",
};

// Server component: fetch trực tiếp từ backend
export default async function ProductsPage() {
  let products: Product[] = [];
  let errorMessage: string | null = null;

  try {
    products = await fetchProducts({ limit: 20 });
  } catch (err) {
    errorMessage = (err as Error).message;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-brand-800">Bộ sưu tập rèm</h1>
      <p className="mt-2 text-brand-700/80">
        Chọn mẫu rèm yêu thích và bấm “Thử với AI” để xem trên ảnh phòng của
        bạn.
      </p>

      {errorMessage ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không kết nối được tới backend: {errorMessage}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-brand-200/60 bg-white/60 p-6 text-sm text-brand-700">
          Chưa có sản phẩm nào. Hãy thêm vào MongoDB qua endpoint{" "}
          <code className="rounded bg-brand-100 px-1 py-0.5">
            POST /products
          </code>
          .
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li
              key={p._id}
              className="overflow-hidden rounded-2xl border border-brand-200/60 bg-white/70 shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-[4/5] w-full bg-brand-100">
                {p.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-brand-700/50">
                    [Chưa có ảnh]
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-brand-800">
                  {p.name}
                </h2>
                <p className="mt-1 text-sm text-brand-700/80">
                  {p.price.toLocaleString("vi-VN")} {p.currency}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/tryon?productId=${p._id}`}
                    className="flex-1 rounded-full bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-brand-700"
                  >
                    Thử với AI
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
