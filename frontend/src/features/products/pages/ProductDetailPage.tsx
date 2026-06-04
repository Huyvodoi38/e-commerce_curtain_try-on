import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { Badge } from '@/components/ui/Badge'
import { useAddCartItemMutation } from '@/features/cart/hooks'
import { useMeQuery } from '@/features/auth/hooks'
import { useProductDetailQuery } from '@/features/products/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { loginPathWithRedirect } from '@/lib/auth/paths'
import { categoryProductsPath } from '@/lib/catalog/categories'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'
import { productImageUrls, productPrimaryImageUrl } from '@/lib/products/images'
import { formatVnd } from '@/lib/utils/formatCurrency'

export function ProductDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)

  const productQuery = useProductDetailQuery(id)
  const meQuery = useMeQuery()
  const addToCartMutation = useAddCartItemMutation()
  const product = productQuery.data
  const images = product ? productImageUrls(product) : []
  const isCustomer = meQuery.data?.role === 'customer'
  const inStock = (product?.stock ?? 0) > 0
  const isNotFound =
    productQuery.isError &&
    axios.isAxiosError(productQuery.error) &&
    productQuery.error.response?.status === 404

  function requireAuthForPurchase() {
    navigate(loginPathWithRedirect(location.pathname))
  }

  useEffect(() => {
    if (!cartNotice) return
    const timer = window.setTimeout(() => setCartNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [cartNotice])

  async function handleAddToCart() {
    if (!product || !inStock) return
    if (!isCustomer) {
      requireAuthForPurchase()
      return
    }
    setCartError(null)
    const qty = Math.min(Math.max(1, quantity), product.stock)
    try {
      await addToCartMutation.mutateAsync({ productId: product.id, quantity: qty })
      setCartNotice(`Đã thêm ${qty} sản phẩm vào giỏ.`)
    } catch (err) {
      setCartNotice(null)
      setCartError(getErrorMessage(err))
    }
  }

  function handleBuyNow() {
    if (!product || !inStock) return
    if (!isCustomer) {
      requireAuthForPurchase()
      return
    }
    const qty = Math.min(Math.max(1, quantity), product.stock)
    const unitPrice = product.effective_price
    navigate('/checkout', {
      state: {
        mode: 'buyNow',
        productId: product.id,
        quantity: qty,
        productName: product.name,
        unitPrice,
        lineTotal: unitPrice * qty,
        displayImageUrl: productPrimaryImageUrl(product),
      },
    })
  }

  if (productQuery.isLoading) {
    return (
      <PageShell title="Chi tiết sản phẩm">
        <ProductDetailSkeleton />
      </PageShell>
    )
  }

  if (isNotFound) {
    return (
      <PageShell title="Không tìm thấy sản phẩm">
        <div className="rounded-lg border border-border bg-surface-raised p-8 text-center">
          <p className="text-foreground-muted">Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.</p>
          <Link to="/products" className="mt-4 inline-block text-brand hover:underline">
            Quay lại danh sách sản phẩm
          </Link>
        </div>
      </PageShell>
    )
  }

  if (productQuery.isError || !product) {
    return (
      <PageShell title="Chi tiết sản phẩm">
        <div className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          Không tải được sản phẩm: {getErrorMessage(productQuery.error)}
        </div>
      </PageShell>
    )
  }

  const maxQuantity = Math.max(product.stock, 1)

  return (
    <PageShell title={product.name} description={product.description ?? undefined}>
      <nav className="mb-6 text-sm text-foreground-muted" aria-label="Breadcrumb">
        <Link to="/products" className="hover:text-brand">
          Sản phẩm
        </Link>
        {product.categories[0] ? (
          <>
            <span className="mx-2 text-foreground-subtle">/</span>
            <Link to={categoryProductsPath(product.categories[0])} className="hover:text-brand">
              {product.categories[0]}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductImageGallery key={product.id} images={images} productName={product.name} />

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {product.is_on_sale ? <Badge tone="success">Đang giảm giá</Badge> : null}
            {inStock ? (
              <Badge tone="success">Còn {product.stock}</Badge>
            ) : (
              <Badge tone="danger">Hết hàng</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-semibold text-brand">{formatVnd(product.effective_price)}</span>
            {product.is_on_sale && product.sale_price ? (
              <span className="text-lg text-foreground-subtle line-through">{formatVnd(product.price)}</span>
            ) : null}
          </div>

          {product.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((slug) => (
                <Link
                  key={slug}
                  to={categoryProductsPath(slug)}
                  className="rounded-full bg-surface-muted px-3 py-1 text-sm text-foreground-muted hover:bg-brand-subtle hover:text-brand"
                >
                  {slug}
                </Link>
              ))}
            </div>
          ) : null}

          {!isCustomer ? (
            <p className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-foreground-muted">
              <Link to={loginPathWithRedirect(location.pathname)} className="font-medium text-brand hover:underline">
                Đăng nhập
              </Link>{' '}
              hoặc{' '}
              <Link to="/register" className="font-medium text-brand hover:underline">
                đăng ký
              </Link>{' '}
              để thêm vào giỏ và mua hàng.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="product-quantity" className="text-sm text-foreground-muted">
              Số lượng
            </label>
            <input
              id="product-quantity"
              type="number"
              min={1}
              max={product.stock || 1}
              value={Math.min(quantity, maxQuantity)}
              disabled={!inStock}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {cartNotice ? (
            <p
              className="rounded-lg border border-success-700/20 bg-success-50 px-4 py-3 text-sm text-success-700"
              role="status"
            >
              {cartNotice}{' '}
              <Link to="/cart" className="font-medium underline hover:no-underline">
                Xem giỏ hàng
              </Link>
            </p>
          ) : null}

          {cartError ? (
            <p className="rounded-lg border border-danger-700/20 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {cartError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={!inStock || addToCartMutation.isPending}
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addToCartMutation.isPending ? 'Đang thêm…' : 'Thêm vào giỏ'}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock}
              className="rounded-md border border-brand px-5 py-2.5 text-sm font-medium text-brand hover:bg-brand-subtle disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mua ngay
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function ProductImageGallery({ images, productName }: { images: string[]; productName: string }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const safeIndex = Math.min(activeImageIndex, Math.max(0, images.length - 1))
  const activeImage = images[safeIndex] ?? null
  const activeSrc = activeImage
    ? (cdnImage(activeImage, cdnPresets.productDetail) ?? activeImage)
    : null

  return (
    <div className="space-y-3">
      <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-border-subtle bg-surface-muted shadow-sm sm:min-h-[320px]">
        {activeSrc ? (
          <img
            src={activeSrc}
            alt={productName}
            className="max-h-[min(70vh,480px)] w-full object-contain"
          />
        ) : (
          <p className="py-16 text-sm text-foreground-subtle">Chưa có ảnh</p>
        )}
      </div>
      {images.length > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Ảnh sản phẩm"
        >
          {images.map((url, index) => {
            const isActive = index === safeIndex
            return (
              <button
                key={`${url}-${index}`}
                type="button"
                role="listitem"
                aria-label={`Ảnh ${index + 1}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActiveImageIndex(index)}
                className={`group shrink-0 rounded-xl p-0.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-subtle shadow-sm'
                    : 'bg-transparent hover:bg-surface-muted'
                }`}
              >
                <span
                  className={`block h-14 w-14 overflow-hidden rounded-[10px] ring-1 transition-all duration-200 ${
                    isActive
                      ? 'ring-brand/40'
                      : 'ring-border/80 group-hover:ring-border'
                  }`}
                >
                  <img
                    src={cdnImage(url, cdnPresets.productThumb) ?? url}
                    alt=""
                    className={`h-full w-full object-cover transition-opacity duration-200 ${
                      isActive ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                    }`}
                  />
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="aspect-square animate-pulse rounded-xl bg-surface-muted" />
      <div className="space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-surface-muted" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-surface-muted" />
      </div>
    </div>
  )
}
