type Props = {
  entries: [string, unknown][]
}

export function ProductAttributesPanel({ entries }: Props) {
  if (entries.length === 0) return null

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-sm"
      aria-labelledby="product-specs-heading"
    >
      <div className="border-b border-border bg-gradient-to-r from-surface-muted/90 to-surface-raised px-5 py-3.5">
        <h2 id="product-specs-heading" className="text-sm font-semibold text-foreground">
          Thông số sản phẩm
        </h2>
      </div>

      <dl className="divide-y divide-border-subtle">
        {entries.map(([key, value], index) => (
          <div
            key={key}
            className={`grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(7.5rem,38%)_1fr] sm:items-center sm:gap-6 ${
              index % 2 === 0 ? 'bg-surface-raised' : 'bg-surface-muted/35'
            }`}
          >
            <dt className="text-sm font-medium text-foreground-muted">{key}</dt>
            <dd className="min-w-0 break-words text-sm font-medium text-foreground">{String(value).trim()}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
