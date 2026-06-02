import type { ReactNode } from 'react'
import type { StatusTone } from '@/lib/theme/statusColors'
import { statusToneClasses } from '@/lib/theme/statusColors'

type Props = {
  children: ReactNode
  tone?: StatusTone
  className?: string
}

export function Badge({ children, tone = 'neutral', className = '' }: Props) {
  const { bg, text } = statusToneClasses[tone]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text} ${className}`}
    >
      {children}
    </span>
  )
}
