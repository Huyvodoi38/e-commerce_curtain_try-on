export type UserRole = 'customer' | 'staff' | 'manager'

export type AuthProvider = 'local' | 'google'

export interface UserPublic {
  id: string
  username: string | null
  email: string | null
  full_name: string
  auth_provider: AuthProvider
  email_verified: boolean
  role: UserRole
  is_active: boolean
  created_at: string
}
