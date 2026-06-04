import { uploadProductImage } from '@/features/media/api'

export type ProductImageDraftItem =
  | { kind: 'saved'; url: string }
  | { kind: 'pending'; file: File; previewUrl: string; id: string }

export function savedUrlsToDraftItems(urls: string[]): ProductImageDraftItem[] {
  return urls.map((url) => ({ kind: 'saved', url }))
}

export function createPendingDraftItem(file: File): ProductImageDraftItem {
  return {
    kind: 'pending',
    file,
    previewUrl: URL.createObjectURL(file),
    id: crypto.randomUUID(),
  }
}

export function revokeProductImageDrafts(items: ProductImageDraftItem[]): void {
  for (const item of items) {
    if (item.kind === 'pending') {
      URL.revokeObjectURL(item.previewUrl)
    }
  }
}

export function draftItemPreviewSrc(item: ProductImageDraftItem): string {
  return item.kind === 'saved' ? item.url : item.previewUrl
}

/** Upload file pending, giữ thứ tự — gọi khi admin xác nhận lưu SP. */
export async function resolveDraftItemsToUrls(items: ProductImageDraftItem[]): Promise<string[]> {
  const urls: string[] = []
  for (const item of items) {
    if (item.kind === 'saved') {
      urls.push(item.url)
    } else {
      const result = await uploadProductImage(item.file)
      urls.push(result.url)
    }
  }
  return urls
}
