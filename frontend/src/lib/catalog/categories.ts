/** Helper URL catalog — danh mục lấy từ API (`features/categories`). */

/** Số danh mục tối đa trên thanh menu nổi bật cửa hàng (CategoryNav). */
export const FEATURED_MENU_LIMIT = 8

export function categoryProductsPath(slug: string): string {
  return `/products?category=${encodeURIComponent(slug)}`
}

export function productsSearchPath(query: string): string {
  const q = query.trim()
  if (!q) return '/products'
  return `/products?search=${encodeURIComponent(q)}`
}
