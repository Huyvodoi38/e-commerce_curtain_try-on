import type { ReactNode } from 'react'

type Props = {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, error, children }: Props) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground-muted">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
    </div>
  )
}

export const inputClassName =
  'w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50'
