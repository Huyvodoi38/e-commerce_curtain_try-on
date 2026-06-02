import type { BankInstructions } from '@/features/orders/types'

const KEY_PREFIX = 'curtain_bank_instructions:'

function key(orderId: string): string {
  return `${KEY_PREFIX}${orderId}`
}

export function saveBankInstructions(instructions: BankInstructions): void {
  try {
    localStorage.setItem(key(instructions.order_id), JSON.stringify(instructions))
  } catch {
    // ignore quota error
  }
}

export function getBankInstructions(orderId: string): BankInstructions | null {
  try {
    const raw = localStorage.getItem(key(orderId))
    if (!raw) return null
    return JSON.parse(raw) as BankInstructions
  } catch {
    return null
  }
}
