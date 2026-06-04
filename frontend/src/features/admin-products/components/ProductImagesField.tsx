import { useRef } from 'react'
import { FormField } from '@/components/form/FormField'
import {
  createPendingDraftItem,
  draftItemPreviewSrc,
  type ProductImageDraftItem,
} from '@/features/admin-products/productImageDraft'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'

type ProductImagesFieldProps = {
  items: ProductImageDraftItem[]
  onChange: (items: ProductImageDraftItem[]) => void
  disabled?: boolean
}

export function ProductImagesField({ items, onChange, disabled }: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(files: FileList | null) {
    if (!files?.length || disabled) return
    const added = Array.from(files).map(createPendingDraftItem)
    onChange([...items, ...added])
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeAt(index: number) {
    const item = items[index]
    if (!item || disabled) return
    if (item.kind === 'pending') {
      URL.revokeObjectURL(item.previewUrl)
    }
    onChange(items.filter((_, i) => i !== index))
  }

  function movePrimaryToFirst(index: number) {
    if (index === 0) return
    const next = [...items]
    const [picked] = next.splice(index, 1)
    if (picked) onChange([picked, ...next])
  }

  const pendingFiles = items.filter((item) => item.kind === 'pending')

  return (
    <FormField label="Ảnh sản phẩm" htmlFor="product-images-upload">
      <div className="space-y-3">
        <div className="space-y-2">
          <label
            htmlFor={disabled ? undefined : 'product-images-upload'}
            className={`inline-block rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-raised'
            }`}
          >
            Chọn ảnh
          </label>
          <input
            ref={inputRef}
            id="product-images-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled}
            className="sr-only"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          {pendingFiles.length > 0 ? (
            <p className="text-sm text-foreground-subtle">
              {pendingFiles.length} ảnh mới: {pendingFiles.map((f) => f.file.name).join(', ')}
            </p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {items.map((item, index) => {
              const rawSrc = draftItemPreviewSrc(item)
              const preview =
                item.kind === 'saved' ? (cdnImage(rawSrc, cdnPresets.adminFormThumb) ?? rawSrc) : rawSrc
              return (
                <li
                  key={item.kind === 'pending' ? item.id : `${item.url}-${index}`}
                  className="relative w-24 shrink-0 rounded-lg border border-border bg-surface-muted p-1"
                >
                  <img src={preview} alt="" className="aspect-square w-full rounded object-cover" />
                  {item.kind === 'pending' ? (
                    <span className="absolute bottom-1 right-1 rounded bg-surface-raised/90 px-1 text-[10px] text-foreground-muted">
                      Mới
                    </span>
                  ) : null}
                  {index === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-brand px-1 text-[10px] text-white">
                      Chính
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => movePrimaryToFirst(index)}
                      className="absolute left-1 top-1 rounded bg-surface-raised/90 px-1 text-[10px] text-foreground-muted hover:text-brand disabled:opacity-50"
                      title="Đặt làm ảnh chính"
                    >
                      Chính
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    disabled={disabled}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-700 text-xs text-white disabled:opacity-50"
                    aria-label="Xóa ảnh"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-foreground-subtle">Chưa có ảnh. Chọn file (sẽ tải lên khi bạn xác nhận lưu).</p>
        )}
      </div>
    </FormField>
  )
}
