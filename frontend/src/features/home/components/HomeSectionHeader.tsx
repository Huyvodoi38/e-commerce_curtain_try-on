import { Link } from 'react-router-dom'

type Props = {
  title: string
  headingId?: string
  viewAllTo?: string
  viewAllLabel?: string
}

export function HomeSectionHeader({ title, headingId, viewAllTo, viewAllLabel = 'Xem tất cả' }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h2 id={headingId} className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      {viewAllTo ? (
        <Link to={viewAllTo} className="text-sm font-medium text-brand hover:underline">
          {viewAllLabel}
        </Link>
      ) : null}
    </div>
  )
}
