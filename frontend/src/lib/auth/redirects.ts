import { canAccessAdmin } from '@/lib/permissions/permissions'
import type { UserRole } from '@/types/auth'

export function sanitizeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth/')) {
    return null
  }
  return value
}

export function getDefaultHomePath(role: UserRole): string {
  return canAccessAdmin(role) ? '/admin/orders' : '/'
}

export function getPostLoginPath(role: UserRole, redirect?: string | null): string {
  if (canAccessAdmin(role)) return '/admin/orders'
  return sanitizeRedirectPath(redirect) ?? '/'
}
