import type { ProductPublic } from '@/features/products/api'

/** Danh sách ảnh — ảnh đầu là ảnh chính (display). */
export function productImageUrls(product: Pick<ProductPublic, 'image_urls' | 'display_image_url'>): string[] {
  if (product.image_urls?.length) return product.image_urls
  if (product.display_image_url) return [product.display_image_url]
  return []
}

export function productPrimaryImageUrl(
  product: Pick<ProductPublic, 'image_urls' | 'display_image_url'>,
): string | null {
  const urls = productImageUrls(product)
  return urls[0] ?? null
}
