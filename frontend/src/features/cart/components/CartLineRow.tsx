import { Link } from 'react-router-dom'
import type { CartLineItem } from '@/features/cart/types'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'
import { formatVnd } from '@/lib/utils/formatCurrency'

type Props = {
  item: CartLineItem
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  isUpdating: boolean
}

export function CartLineRow({ item, onQuantityChange, onRemove, isUpdating }: Props) {
  const atMax = item.quantity >= item.stock

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-surface-raised p-4">
      <Link
        to={`/products/${item.product_id}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted"
      >
        {item.display_image_url ? (
          <img
            src={cdnImage(item.display_image_url, cdnPresets.cartThumb) ?? item.display_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-foreground-subtle">
            N/A
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/products/${item.product_id}`}
          className="font-medium text-foreground hover:text-brand"
        >
          {item.name}
        </Link>
        <p className="mt-1 text-sm text-foreground-muted">{formatVnd(item.unit_price)} / sp</p>
        <p className="text-sm font-medium text-brand">{formatVnd(item.line_total)}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            disabled={isUpdating || item.quantity <= 1}
            onClick={() => onQuantityChange(item.quantity - 1)}
            className="px-2.5 py-1.5 text-sm hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Giảm số lượng"
          >
            −
          </button>
          <span className="min-w-[2rem] px-1 text-center text-sm tabular-nums">{item.quantity}</span>
          <button
            type="button"
            disabled={isUpdating || atMax}
            onClick={() => onQuantityChange(item.quantity + 1)}
            className="px-2.5 py-1.5 text-sm hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={isUpdating}
          onClick={onRemove}
          className="text-xs text-foreground-muted hover:text-danger-700 disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </article>
  )
}
