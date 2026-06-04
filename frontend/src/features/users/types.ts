import type { UserPublic, UserRole } from '@/types/auth'

export type UserListResponse = {
  items: UserPublic[]
  total: number
  page: number
  page_size: number
}

export type ListUsersParams = {
  page?: number
  page_size?: number
  role?: UserRole
  is_active?: boolean
  search?: string
}

export type UserPatchBody = {
  full_name?: string
  is_active?: boolean
  password?: string
  reason?: string
}

export type UserCreateBody = {
  role: 'staff'
  username: string
  password: string
  full_name: string
}

export type ActivityAction =
  | 'user.registered'
  | 'user.registered_google'
  | 'user.created'
  | 'user.updated'
  | 'user.deactivated'
  | 'user.activated'
  | 'order.created'
  | 'order.created_buy_now'
  | 'order.cancelled'
  | 'order.payment_confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled_by_staff'
  | 'order.payment_vnpay'
  | 'order.cancelled_vnpay_expired'

export type ActivityLog = {
  id: string
  actor_id: string
  actor_role: UserRole
  actor_name: string
  action: ActivityAction
  customer_id?: string | null
  target_user_id?: string | null
  order_id?: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ActivityLogListResponse = {
  items: ActivityLog[]
  total: number
  page: number
  page_size: number
}
