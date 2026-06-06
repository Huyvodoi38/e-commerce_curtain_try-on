import { FormField, inputClassName } from '@/components/form/FormField'
import {
  resolveAiPromptFromAttributes,
  SUGGESTED_ATTRIBUTE_ROWS,
  type AiResolveResult,
} from '@/lib/ai/promptResolver'

export type ProductAttributeRow = {
  key: string
  value: string
}

type Props = {
  rows: ProductAttributeRow[]
  onChange: (rows: ProductAttributeRow[]) => void
  disabled?: boolean
}

export function ProductAttributesField({ rows, onChange, disabled }: Props) {
  const attributesRecord = Object.fromEntries(
    rows.filter((r) => r.key.trim() && r.value.trim()).map((r) => [r.key.trim(), r.value.trim()]),
  )
  const aiResolve: AiResolveResult = resolveAiPromptFromAttributes(attributesRecord)

  function updateRow(index: number, patch: Partial<ProductAttributeRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    onChange([...rows, { key: '', value: '' }])
  }

  function removeRow(index: number) {
    if (rows.length <= 1) {
      onChange([{ key: '', value: '' }])
      return
    }
    onChange(rows.filter((_, i) => i !== index))
  }

  function applySuggested() {
    onChange(SUGGESTED_ATTRIBUTE_ROWS.map((row) => ({ ...row })))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground-muted">Thuộc tính sản phẩm (hiển thị cho khách)</p>
        {!disabled ? (
          <button
            type="button"
            onClick={applySuggested}
            className="text-xs font-medium text-brand hover:underline"
          >
            Điền mẫu AI
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <FormField label={index === 0 ? 'Tên thuộc tính' : undefined} htmlFor={`attr-key-${index}`}>
              <input
                id={`attr-key-${index}`}
                value={row.key}
                disabled={disabled}
                onChange={(e) => updateRow(index, { key: e.target.value })}
                placeholder="VD: Màu sắc"
                className={inputClassName}
              />
            </FormField>
            <FormField label={index === 0 ? 'Giá trị' : undefined} htmlFor={`attr-val-${index}`}>
              <input
                id={`attr-val-${index}`}
                value={row.value}
                disabled={disabled}
                onChange={(e) => updateRow(index, { value: e.target.value })}
                placeholder="VD: Trắng"
                className={inputClassName}
              />
            </FormField>
            {!disabled ? (
              <div className={index === 0 ? 'pt-6' : 'pt-0'}>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-md border border-border px-3 py-2 text-xs text-foreground-muted hover:bg-surface-muted"
                >
                  Xóa
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!disabled ? (
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-foreground-muted hover:border-brand hover:text-brand"
        >
          + Thêm thuộc tính
        </button>
      ) : null}

      <AiResolveBadge resolve={aiResolve} />
    </div>
  )
}

function AiResolveBadge({ resolve }: { resolve: AiResolveResult }) {
  if (resolve.available) {
    return (
      <p className="rounded-lg border border-success-700/20 bg-success-50 px-3 py-2 text-sm text-success-700">
        Đủ điều kiện thử rèm AI — thuộc tính map được sang prompt.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-amber-700/20 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">Chưa bật thử rèm AI</p>
      {resolve.missingSlots.length ? (
        <p className="mt-1">Thiếu: {resolve.missingSlots.join(', ')}</p>
      ) : null}
      {resolve.unmapped.length ? (
        <p className="mt-1">Không nhận diện: {resolve.unmapped.join('; ')}</p>
      ) : null}
      <p className="mt-1 text-xs opacity-80">
        Dùng tên field gợi ý (Màu sắc, Chất liệu, Kiểu hoa văn, Độ che sáng) và giá trị tiếng Việt
        phổ biến.
      </p>
    </div>
  )
}
