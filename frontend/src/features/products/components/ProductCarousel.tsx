import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductCard } from '@/features/products/components/ProductCard'
import type { ProductPublic } from '@/features/products/api'

export const PRODUCT_CAROUSEL_CARD_CLASS =
  'w-[75%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)]'

type Props = {
  products: ProductPublic[]
  isLoading?: boolean
  loadingCount?: number
  listAriaLabel: string
}

function CarouselArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const label = direction === 'left' ? 'Cuộn trái' : 'Cuộn phải'
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground-muted shadow-sm transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        {direction === 'left' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  )
}

function CarouselSkeleton({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex gap-4">
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className={`${PRODUCT_CAROUSEL_CARD_CLASS} overflow-hidden rounded-xl border border-border bg-surface-raised`}
            >
              <div className="aspect-[4/3] animate-pulse bg-surface-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProductCarousel({ products, isLoading = false, loadingCount = 3, listAriaLabel }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < maxScroll - 4)
  }, [])

  const itemCount = products.length

  useEffect(() => {
    const el = scrollRef.current
    if (!el || itemCount === 0) return

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
  }, [itemCount, updateScrollState])

  function scrollByDirection(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-carousel-card]')
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.9
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' })
    window.setTimeout(updateScrollState, 300)
  }

  if (isLoading) {
    return <CarouselSkeleton count={loadingCount} />
  }

  if (products.length === 0) {
    return null
  }

  const showArrows = products.length > 1

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {showArrows ? (
        <CarouselArrow direction="left" disabled={!canScrollLeft} onClick={() => scrollByDirection('left')} />
      ) : null}

      <div
        ref={scrollRef}
        className="min-w-0 flex-1 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label={listAriaLabel}
      >
        {products.map((product) => (
          <div key={product.id} data-carousel-card role="listitem" className={PRODUCT_CAROUSEL_CARD_CLASS}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {showArrows ? (
        <CarouselArrow direction="right" disabled={!canScrollRight} onClick={() => scrollByDirection('right')} />
      ) : null}
    </div>
  )
}
