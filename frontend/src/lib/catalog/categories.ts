/** Helper URL catalog — danh mục lấy từ API (`features/categories`). */

export function categoryProductsPath(slug: string): string {
  return `/products?category=${encodeURIComponent(slug)}`
}

export function productsSearchPath(query: string): string {
  const q = query.trim()
  if (!q) return '/products'
  return `/products?search=${encodeURIComponent(q)}`
}
