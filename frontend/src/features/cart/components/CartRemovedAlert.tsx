type Props = {
  removedCount: number
}

export function CartRemovedAlert({ removedCount }: Props) {
  if (removedCount <= 0) return null

  return (
    <div
      className="rounded-lg border border-warning-700/25 bg-warning-50 px-4 py-3 text-sm text-warning-700"
      role="status"
    >
      {removedCount === 1
        ? 'Một sản phẩm đã bị gỡ khỏi giỏ vì không còn bán.'
        : `${removedCount} sản phẩm đã bị gỡ khỏi giỏ vì không còn bán.`}
    </div>
  )
}
