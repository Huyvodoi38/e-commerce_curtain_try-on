/** Tone màu cho badge trạng thái — khớp token trong index.css */

export type StatusTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger'

export const paymentStatusTone = {
  unpaid: 'warning',
  paid: 'success',
} as const satisfies Record<string, StatusTone>

export const orderStatusTone = {
  pending: 'neutral',
  shipped: 'brand',
  delivered: 'success',
  cancelled: 'danger',
} as const satisfies Record<string, StatusTone>

export const statusToneClasses: Record<
  StatusTone,
  { bg: string; text: string }
> = {
  brand: { bg: 'bg-brand-subtle', text: 'text-brand' },
  neutral: { bg: 'bg-surface-muted', text: 'text-foreground-muted' },
  success: { bg: 'bg-success-50', text: 'text-success-700' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-700' },
}
