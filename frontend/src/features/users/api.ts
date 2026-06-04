import { apiClient } from '@/lib/api/client'
import type {
  ActivityLogListResponse,
  ListUsersParams,
  UserCreateBody,
  UserListResponse,
  UserPatchBody,
} from '@/features/users/types'
import type { UserPublic } from '@/types/auth'

export async function createUser(body: UserCreateBody): Promise<UserPublic> {
  const { data } = await apiClient.post<UserPublic>('/users', body)
  return data
}

export async function fetchUsers(params: ListUsersParams = {}): Promise<UserListResponse> {
  const { data } = await apiClient.get<UserListResponse>('/users', { params })
  return data
}

export async function fetchUser(userId: string): Promise<UserPublic> {
  const { data } = await apiClient.get<UserPublic>(`/users/${userId}`)
  return data
}

export async function patchUser(userId: string, body: UserPatchBody): Promise<UserPublic> {
  const { data } = await apiClient.patch<UserPublic>(`/users/${userId}`, body)
  return data
}

export async function fetchUserAuditLogs(
  userId: string,
  params: { page?: number; page_size?: number } = {},
): Promise<ActivityLogListResponse> {
  const { data } = await apiClient.get<ActivityLogListResponse>(`/users/${userId}/audit-logs`, { params })
  return data
}
