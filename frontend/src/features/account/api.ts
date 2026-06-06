import { apiClient } from '@/lib/api/client'
import type { UserPublic } from '@/types/auth'

export async function patchProfile(body: { full_name: string }): Promise<UserPublic> {
  const { data } = await apiClient.patch<UserPublic>('/auth/me', body)
  return data
}

export async function changePassword(body: {
  current_password: string
  new_password: string
}): Promise<void> {
  await apiClient.post('/auth/change-password', body)
}
