import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProductSearchSuggestionsQuery } from '@/features/products/hooks'
import { productDetailPath } from '@/lib/catalog/products'
import { productsSearchPath } from '@/lib/catalog/categories'
import { productPrimaryImageUrl } from '@/lib/products/images'
import { cdnImage, cdnPresets } from '@/lib/cloudinary/url'
import { formatVnd } from '@/lib/utils/formatCurrency'

const DEBOUNCE_MS = 300
const SUGGESTION_LIMIT = 6
const MIN_QUERY_LEN = 2

export function HeaderSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('search') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(() => (searchParams.get('search') ?? '').trim())
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const suggestionsQuery = useProductSearchSuggestionsQuery(debouncedQuery, SUGGESTION_LIMIT)
  const suggestions = suggestionsQuery.data?.items ?? []
  const showDropdown = open && debouncedQuery.length >= MIN_QUERY_LEN

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setOpen(false)
    navigate(productsSearchPath(query))
  }

  function closeAndNavigate(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mx-4 hidden min-w-0 flex-1 sm:block sm:max-w-md lg:max-w-xl"
    >
      <label htmlFor="header-search" className="sr-only">
        Tìm sản phẩm
      </label>
      <div ref={rootRef} className="relative">
        <input
          id="header-search"
          type="search"
          value={query}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Tìm rèm, phòng khách…"
          className="w-full rounded-lg border border-border bg-surface-muted py-2 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-subtle focus:border-brand focus:bg-surface-raised focus:ring-2 focus:ring-focus-ring"
        />
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
          aria-hidden
        >
          <SearchIcon />
        </span>

        {showDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Gợi ý sản phẩm"
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
          >
            {suggestionsQuery.isLoading ? (
              <p className="px-4 py-3 text-sm text-foreground-subtle">Đang tìm…</p>
            ) : null}

            {suggestionsQuery.isError ? (
              <p className="px-4 py-3 text-sm text-danger-700">Không tải được gợi ý. Thử lại sau.</p>
            ) : null}

            {!suggestionsQuery.isLoading && !suggestionsQuery.isError && suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-foreground-muted">
                Không tìm thấy sản phẩm cho &ldquo;{debouncedQuery}&rdquo;
              </p>
            ) : null}

            {suggestions.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-1">
                {suggestions.map((product) => {
                  const thumb = cdnImage(productPrimaryImageUrl(product), cdnPresets.productCard)
                  return (
                    <li key={product.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => closeAndNavigate(productDetailPath(product.id))}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[10px] text-foreground-subtle">
                              N/A
                            </span>
                          )}
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</span>
                          <span className="mt-0.5 block text-sm font-semibold text-brand">
                            {formatVnd(product.effective_price)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            <div className="border-t border-border-subtle px-3 py-2">
              <Link
                to={productsSearchPath(query)}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-1.5 text-sm font-medium text-brand hover:bg-brand-subtle"
              >
                Xem tất cả kết quả cho &ldquo;{debouncedQuery}&rdquo;
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  )
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  )
}
