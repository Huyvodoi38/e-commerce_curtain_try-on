import { useEffect } from 'react'
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { FormField, inputClassName } from '@/components/form/FormField'
import type { CheckoutFormValues } from '@/features/orders/schemas'
import { useVietnamCommunesQuery, useVietnamProvincesQuery } from '@/lib/vietnam-admin/hooks'

const selectClassName = `${inputClassName} cursor-pointer`

type Props = {
  register: UseFormRegister<CheckoutFormValues>
  control: Control<CheckoutFormValues>
  errors: FieldErrors<CheckoutFormValues>
  setValue: UseFormSetValue<CheckoutFormValues>
  watch: UseFormWatch<CheckoutFormValues>
}

export function ShippingAddressFields({ register, control, errors, setValue, watch }: Props) {
  const provinceId = watch('province_id')
  const provincesQuery = useVietnamProvincesQuery()
  const communesQuery = useVietnamCommunesQuery(provinceId || undefined)

  useEffect(() => {
    if (!provinceId) {
      setValue('commune_id', '')
    }
  }, [provinceId, setValue])

  const provinces = provincesQuery.data ?? []
  const communes = communesQuery.data ?? []

  return (
    <div className="space-y-4">
      <FormField label="Họ tên người nhận" htmlFor="full_name" error={errors.full_name?.message}>
        <input id="full_name" type="text" autoComplete="name" className={inputClassName} {...register('full_name')} />
      </FormField>

      <FormField label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}>
        <input id="phone" type="tel" autoComplete="tel" className={inputClassName} {...register('phone')} />
      </FormField>

      <FormField label="Số nhà, tên đường" htmlFor="line1" error={errors.line1?.message}>
        <input
          id="line1"
          type="text"
          autoComplete="address-line1"
          placeholder="VD: 123 Nguyễn Trãi"
          className={inputClassName}
          {...register('line1')}
        />
      </FormField>

      <div className="rounded-lg border border-border-subtle bg-surface-muted/50 p-4">
        <p className="text-sm font-medium text-foreground">Khu vực hành chính</p>
        <p className="mt-0.5 text-xs text-foreground-subtle">
          Theo mô hình 2 cấp từ 01/07/2025 (tỉnh/thành phố → phường/xã/thị trấn).
        </p>

        <div className="mt-4 space-y-4">
          <FormField label="Tỉnh / thành phố" htmlFor="province_id" error={errors.province_id?.message}>
            <Controller
              name="province_id"
              control={control}
              render={({ field }) => (
                <select
                  id="province_id"
                  className={selectClassName}
                  disabled={provincesQuery.isLoading}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    setValue('commune_id', '')
                  }}
                >
                  <option value="">
                    {provincesQuery.isLoading ? 'Đang tải…' : '— Chọn tỉnh/thành phố —'}
                  </option>
                  {provinces.map((p) => (
                    <option key={p.idProvince} value={p.idProvince}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </FormField>

          <FormField
            label="Phường / xã / thị trấn"
            htmlFor="commune_id"
            error={errors.commune_id?.message}
          >
            <Controller
              name="commune_id"
              control={control}
              render={({ field }) => (
                <select
                  id="commune_id"
                  className={selectClassName}
                  disabled={!provinceId || communesQuery.isLoading}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value="">
                    {!provinceId
                      ? '— Chọn tỉnh trước —'
                      : communesQuery.isLoading
                        ? 'Đang tải…'
                        : '— Chọn phường/xã/thị trấn —'}
                  </option>
                  {communes.map((c) => (
                    <option key={c.idCommune} value={c.idCommune}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </FormField>

          {provincesQuery.isError ? (
            <p className="text-sm text-danger-700">Không tải được danh sách tỉnh/thành phố.</p>
          ) : null}
          {communesQuery.isError && provinceId ? (
            <p className="text-sm text-danger-700">Không tải được danh sách phường/xã.</p>
          ) : null}
        </div>
      </div>

      <FormField label="Ghi chú giao hàng (tuỳ chọn)" htmlFor="note" error={errors.note?.message}>
        <textarea
          id="note"
          rows={2}
          className={`${inputClassName} resize-y`}
          placeholder="VD: Gọi trước khi giao"
          {...register('note')}
        />
      </FormField>
    </div>
  )
}
