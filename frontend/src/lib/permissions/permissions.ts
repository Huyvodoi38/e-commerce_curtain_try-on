import type { UserRole } from '@/types/auth'

export function isStaffOrAbove(role: UserRole): boolean {
  return role === 'staff' || role === 'manager'
}

export function isManager(role: UserRole): boolean {
  return role === 'manager'
}

export function canAccessAdmin(role: UserRole): boolean {
  return isStaffOrAbove(role)
}

export function canManageOrders(role: UserRole): boolean {
  return isStaffOrAbove(role)
}

export function canManageCustomers(role: UserRole): boolean {
  return isStaffOrAbove(role)
}

export function canManageStaff(role: UserRole): boolean {
  return isManager(role)
}

export function canManagePromotions(role: UserRole): boolean {
  return isStaffOrAbove(role)
}

export function canViewSystemAuditLogs(role: UserRole): boolean {
  return isManager(role)
}
