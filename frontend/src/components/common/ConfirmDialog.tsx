import type { ReactNode } from 'react'

type ConfirmDialogProps = {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'brand' | 'danger'
  pending?: boolean
  confirmDisabled?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'brand',
  pending = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-raised p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <div className="mt-2 text-sm text-foreground-muted">{description}</div> : null}
        {children}
        {error ? <p className="mt-2 text-sm text-danger-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              variant === 'danger' ? 'bg-danger-700 hover:opacity-90' : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            {pending ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
