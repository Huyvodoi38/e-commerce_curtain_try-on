export function productDetailPath(id: string): string {
  return `/products/${encodeURIComponent(id)}`
}
