import type { KeyboardEvent } from 'react'

type Props = {
  value: number
  max?: number
  size?: 'sm' | 'md'
  interactive?: boolean
  onChange?: (value: number) => void
  label?: string
}

function starClass(filled: boolean, size: 'sm' | 'md') {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return `${dim} ${filled ? 'text-amber-400' : 'text-neutral-300'}`
}

export function StarRating({ value, max = 5, size = 'md', interactive = false, onChange, label }: Props) {
  const stars = Array.from({ length: max }, (_, index) => index + 1)
  const groupLabel = label ?? 'Chọn số sao'

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!interactive || !onChange) return

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onChange(Math.min(max, value + 1))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onChange(Math.max(1, value - 1))
    }
  }

  if (interactive && onChange) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        role="radiogroup"
        aria-label={groupLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} sao`}
            tabIndex={star === value ? 0 : -1}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <StarIcon className={starClass(star <= value, size)} filled={star <= value} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {stars.map((star) => {
        const filled = star <= Math.floor(value)
        return <StarIcon key={star} className={starClass(filled, size)} filled={filled} />
      })}
    </div>
  )
}

function StarIcon({ className, filled }: { className: string; filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path
        strokeWidth={1.2}
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  )
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
