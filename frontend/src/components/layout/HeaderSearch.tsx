import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { productsSearchPath } from '@/lib/catalog/categories'

export function HeaderSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('search') ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    navigate(productsSearchPath(query))
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 hidden min-w-0 flex-1 sm:block sm:max-w-md lg:max-w-xl">
      <label htmlFor="header-search" className="sr-only">
        Tìm sản phẩm
      </label>
      <div className="relative">
        <input
          id="header-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm rèm, phòng khách…"
          className="w-full rounded-lg border border-border bg-surface-muted py-2 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-subtle focus:border-brand focus:bg-surface-raised focus:ring-2 focus:ring-focus-ring"
        />
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
          aria-hidden
        >
          <SearchIcon />
        </span>
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
