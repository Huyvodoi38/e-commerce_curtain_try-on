import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  children?: ReactNode
}

export function PageShell({ title, description, children }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-foreground-muted">{description}</p> : null}
      </header>
      {children ?? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-surface-raised p-8 text-center text-foreground-subtle">
          Trang đang được triển khai — xem <code className="text-sm">FE_SPEC.md</code>.
        </div>
      )}
    </div>
  )
}
