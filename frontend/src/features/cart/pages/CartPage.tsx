import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { CartEmptyState } from '@/features/cart/components/CartEmptyState'
import { CartLineRow } from '@/features/cart/components/CartLineRow'
import { CartRemovedAlert } from '@/features/cart/components/CartRemovedAlert'
import {
  useCartQuery,
  useClearCartMutation,
  useDeleteCartItemMutation,
  usePatchCartItemMutation,
} from '@/features/cart/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { formatVnd } from '@/lib/utils/formatCurrency'

export function CartPage() {
  const cartQuery = useCartQuery(true)
  const patchMutation = usePatchCartItemMutation()
  const deleteMutation = useDeleteCartItemMutation()
  const clearMutation = useClearCartMutation()
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null)

  const cart = cartQuery.data
  const isBusy =
    patchMutation.isPending || deleteMutation.isPending || clearMutation.isPending

  async function handleQuantityChange(productId: string, quantity: number) {
    setUpdatingProductId(productId)
    try {
      if (quantity <= 0) {
        await deleteMutation.mutateAsync(productId)
      } else {
        await patchMutation.mutateAsync({ productId, quantity })
      }
    } finally {
      setUpdatingProductId(null)
    }
  }

  async function handleClearCart() {
    if (!cart?.items.length) return
    if (!window.confirm('Xóa toàn bộ sản phẩm trong giỏ?')) return
    await clearMutation.mutateAsync()
  }

  if (cartQuery.isLoading) {
    return (
      <PageShell title="Giỏ hàng">
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      </PageShell>
    )
  }

  if (cartQuery.isError) {
    return (
      <PageShell title="Giỏ hàng">
        <div className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          Không tải được giỏ hàng: {getErrorMessage(cartQuery.error)}
        </div>
      </PageShell>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell title="Giỏ hàng">
        <CartRemovedAlert removedCount={cart?.removed_product_ids.length ?? 0} />
        <div className="mt-4">
          <CartEmptyState />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Giỏ hàng" description={`${cart.item_count} sản phẩm`}>
      <div className="space-y-4">
        <CartRemovedAlert removedCount={cart.removed_product_ids.length} />

        {cart.items.map((item) => (
          <CartLineRow
            key={item.product_id}
            item={item}
            isUpdating={isBusy && updatingProductId === item.product_id}
            onQuantityChange={(qty) => void handleQuantityChange(item.product_id, qty)}
            onRemove={() => void handleQuantityChange(item.product_id, 0)}
          />
        ))}

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Tạm tính</span>
            <span className="text-brand">{formatVnd(cart.subtotal)}</span>
          </div>
          <p className="mt-1 text-sm text-foreground-subtle">
            Chưa bao gồm phí vận chuyển và khuyến mãi (áp dụng khi thanh toán).
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/checkout"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover"
            >
              Thanh toán
            </Link>
            <Link
              to="/products"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
            >
              Tiếp tục mua sắm
            </Link>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleClearCart()}
              className="ml-auto text-sm text-foreground-muted hover:text-danger-700 disabled:opacity-50"
            >
              Xóa giỏ hàng
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
