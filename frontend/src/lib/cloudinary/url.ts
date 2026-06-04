const CLOUDINARY_HOST = 'res.cloudinary.com'

export function isCloudinaryUrl(url: string): boolean {
  return url.includes(CLOUDINARY_HOST)
}

export type CdnImageOptions = {
  width: number
  /** Tỷ lệ khung Cloudinary, vd. "1:1", "4:3" — dùng với crop fill */
  aspectRatio?: `${number}:${number}`
  /**
   * limit — chỉ thu nhỏ, không phóng to ảnh gốc nhỏ
   * fill — crop khớp khung UI (giảm cảm giác “zoom” khi object-cover)
   */
  crop?: 'limit' | 'fill'
}

function buildTransform(opts: CdnImageOptions): string {
  const parts: string[] = ['f_auto', 'q_auto']
  if (opts.crop === 'fill' && opts.aspectRatio) {
    parts.unshift('c_fill', 'g_auto', `ar_${opts.aspectRatio}`)
  } else {
    parts.unshift('c_limit')
  }
  parts.push(`w_${opts.width}`)
  return parts.join(',')
}

/** Bỏ transform cũ (nếu URL đã qua CDN) rồi gắn transform mới. */
function stripTransformsAfterUpload(pathAfterUpload: string): string {
  const segments = pathAfterUpload.split('/')
  const kept: string[] = []
  let foundAsset = false
  for (const seg of segments) {
    if (foundAsset) {
      kept.push(seg)
      continue
    }
    if (/^v\d+$/.test(seg)) continue
    if (seg.includes(',') || (seg.includes('_') && !/\.(jpe?g|png|webp|gif|svg)$/i.test(seg))) {
      continue
    }
    foundAsset = true
    kept.push(seg)
  }
  return kept.join('/')
}

/** Resize ảnh Cloudinary qua URL transform (CDN). URL khác giữ nguyên. */
export function cdnImage(
  url: string | null | undefined,
  options: number | CdnImageOptions = 400,
): string | null {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  if (!trimmed.includes(CLOUDINARY_HOST) || !trimmed.includes('/upload/')) {
    return trimmed
  }

  const opts: CdnImageOptions =
    typeof options === 'number' ? { width: options, crop: 'limit' } : { crop: 'limit', ...options }

  const marker = '/upload/'
  const idx = trimmed.indexOf(marker)
  const prefix = trimmed.slice(0, idx + marker.length)
  const suffix = stripTransformsAfterUpload(trimmed.slice(idx + marker.length))
  const transform = buildTransform(opts)
  return `${prefix}${transform}/${suffix}`
}

/** Preset thường dùng — kích thước ~2× pixel hiển thị (retina). */
export const cdnPresets = {
  productCard: { width: 360, aspectRatio: '4:3', crop: 'fill' } satisfies CdnImageOptions,
  /** Chi tiết SP: giữ tỷ lệ gốc, không crop zoom (dùng với object-contain) */
  productDetail: { width: 480, crop: 'limit' } satisfies CdnImageOptions,
  productThumb: { width: 96, aspectRatio: '1:1', crop: 'fill' } satisfies CdnImageOptions,
  cartThumb: { width: 160, aspectRatio: '1:1', crop: 'fill' } satisfies CdnImageOptions,
  adminTableThumb: { width: 80, aspectRatio: '1:1', crop: 'fill' } satisfies CdnImageOptions,
  adminFormThumb: { width: 120, aspectRatio: '1:1', crop: 'fill' } satisfies CdnImageOptions,
} as const
