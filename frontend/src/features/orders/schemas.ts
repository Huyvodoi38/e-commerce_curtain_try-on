import { z } from 'zod'

export const shippingAddressSchema = z.object({
  full_name: z.string().trim().min(1, 'Nhập họ tên người nhận').max(120),
  phone: z
    .string()
    .trim()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, 'Số điện thoại không hợp lệ'),
  line1: z.string().trim().min(1, 'Nhập số nhà, tên đường').max(200),
  province_id: z.string().min(1, 'Chọn tỉnh/thành phố'),
  commune_id: z.string().min(1, 'Chọn phường/xã/thị trấn'),
  note: z.string().trim().max(300).optional(),
})

export const checkoutSchema = shippingAddressSchema
  .extend({
    payment_method: z.enum(['offline', 'vnpay']),
    offline_subtype: z.enum(['cod', 'bank']).optional(),
    promotion_code: z.string().trim().max(32).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === 'offline' && !data.offline_subtype) {
      ctx.addIssue({
        code: 'custom',
        message: 'Chọn hình thức thanh toán offline',
        path: ['offline_subtype'],
      })
    }
  })

export type CheckoutFormValues = z.infer<typeof checkoutSchema>

/** Lưu province_id + commune_id (mô hình 2 cấp NQ 202/2025). */
export const SHIPPING_ADDRESS_STORAGE_KEY = 'curtain_checkout_shipping_v2'
