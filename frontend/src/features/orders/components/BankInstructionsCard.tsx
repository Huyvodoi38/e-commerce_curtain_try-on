import { useState } from 'react'
import type { BankInstructions } from '@/features/orders/types'

type Props = {
  instructions: BankInstructions
}

function formatCopyText(instructions: BankInstructions): string {
  return [
    `Ngân hàng: ${instructions.bank_name}`,
    `Số tài khoản: ${instructions.account_number}`,
    `Chủ tài khoản: ${instructions.account_holder}`,
    `Nội dung CK: ${instructions.transfer_note}`,
    `Mã đơn: ${instructions.order_id}`,
  ].join('\n')
}

export function BankInstructionsCard({ instructions }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatCopyText(instructions))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-xl border border-brand/30 bg-brand-subtle/40 p-5">
      <h3 className="font-semibold text-foreground">Thông tin chuyển khoản</h3>
      <p className="mt-1 text-sm text-foreground-muted">
        Vui lòng chuyển khoản đúng nội dung để nhân viên đối soát đơn hàng.
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-muted">Ngân hàng</dt>
          <dd className="font-medium text-foreground">{instructions.bank_name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-muted">Số tài khoản</dt>
          <dd className="font-mono font-medium text-foreground">{instructions.account_number}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-muted">Chủ tài khoản</dt>
          <dd className="font-medium text-foreground">{instructions.account_holder}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-muted">Nội dung CK</dt>
          <dd className="font-mono text-right text-sm font-medium text-brand">{instructions.transfer_note}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-muted">Mã đơn</dt>
          <dd className="font-mono text-sm text-foreground">{instructions.order_id}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-4 rounded-md border border-brand bg-surface-raised px-4 py-2 text-sm font-medium text-brand hover:bg-brand-subtle"
      >
        {copied ? 'Đã sao chép' : 'Sao chép thông tin'}
      </button>
    </div>
  )
}
