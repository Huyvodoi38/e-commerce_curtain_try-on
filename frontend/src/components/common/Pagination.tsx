type PaginationToken = number | 'ellipsis'

export type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  ariaLabel?: string
  className?: string
}

export function resolveTotalPages(total: number, pageSize: number, pages?: number): number {
  if (pages != null && pages > 0) return pages
  return Math.max(1, Math.ceil(total / pageSize))
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  ariaLabel = 'Phân trang',
  className = 'mt-6',
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Trang trước
      </button>
      <nav aria-label={ariaLabel} className="flex items-center gap-1">
        {buildPaginationTokens(page, totalPages).map((token, idx) =>
          token === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-sm text-foreground-subtle"
              aria-hidden
            >
              ...
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => onPageChange(token)}
              className={`min-w-8 rounded-md px-2 py-1.5 text-sm ${
                token === page
                  ? 'bg-brand text-on-brand'
                  : 'text-foreground-muted hover:bg-surface-muted'
              }`}
              aria-current={token === page ? 'page' : undefined}
            >
              {token}
            </button>
          ),
        )}
      </nav>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Trang sau
      </button>
    </div>
  )
}

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 8) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  if (currentPage <= 4) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
    pages.add(5)
  }
  if (currentPage >= totalPages - 3) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
    pages.add(totalPages - 4)
  }

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const tokens: PaginationToken[] = []
  for (let i = 0; i < sorted.length; i++) {
    const pageNum = sorted[i]
    const prev = sorted[i - 1]
    if (i > 0 && pageNum - prev > 1) tokens.push('ellipsis')
    tokens.push(pageNum)
  }
  return tokens
}
