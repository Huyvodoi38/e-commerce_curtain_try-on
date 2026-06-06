import { z } from 'zod'

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Nhập họ tên').max(120, 'Họ tên tối đa 120 ký tự'),
})

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    new_password: z
      .string()
      .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
      .max(128, 'Mật khẩu tối đa 128 ký tự'),
    confirm_password: z.string().min(1, 'Xác nhận mật khẩu mới'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  })

export type ProfileFormValues = z.infer<typeof profileSchema>
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
