import { Link } from 'react-router-dom'
import { StarRating } from '@/features/reviews/components/StarRating'
import type { ProductPublic } from '@/features/products/api'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'
import { productDetailPath } from '@/lib/catalog/products'
import { productPrimaryImageUrl } from '@/lib/products/images'
import { formatVnd } from '@/lib/utils/formatCurrency'

type Props = {
  product: ProductPublic
}

export function ProductCard({ product }: Props) {
  const thumb = cdnImage(productPrimaryImageUrl(product), cdnPresets.productCard)

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface-raised transition-shadow hover:shadow-md">
      <Link to={productDetailPath(product.id)} className="block">
        <div className="aspect-[4/3] bg-surface-muted">
          {thumb ? (
            <img src={thumb} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-foreground-subtle">Chưa có ảnh</div>
          )}
        </div>
      </Link>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 font-medium text-foreground">
          <Link to={productDetailPath(product.id)} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-brand">{formatVnd(product.effective_price)}</span>
          {product.is_on_sale && product.sale_price ? (
            <span className="text-sm text-foreground-subtle line-through">{formatVnd(product.price)}</span>
          ) : null}
        </div>
        {product.rating_count > 0 && product.rating_avg != null ? (
          <div className="flex items-center gap-1.5 text-xs text-foreground-subtle">
            <StarRating value={product.rating_avg} size="sm" label={`${product.rating_avg} sao`} />
            <span>{product.rating_avg.toFixed(1)}</span>
          </div>
        ) : null}
        <div className="text-sm text-foreground-subtle">
          {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
        </div>
      </div>
    </article>
  )
}
