import { z } from 'zod'

const usernameField = z
  .string()
  .trim()
  .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
  .max(32, 'Tên đăng nhập tối đa 32 ký tự')
  .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ gồm chữ, số và _')

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Nhập tên đăng nhập'),
  password: z.string().min(1, 'Nhập mật khẩu'),
})

export const registerSchema = z.object({
  username: usernameField,
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .max(128, 'Mật khẩu tối đa 128 ký tự'),
  full_name: z.string().trim().min(1, 'Nhập họ tên').max(120, 'Họ tên tối đa 120 ký tự'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
