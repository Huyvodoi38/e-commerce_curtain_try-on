import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  fetchUser,
  fetchUserAuditLogs,
  fetchUsers,
  patchUser,
} from '@/features/users/api'
import type { ListUsersParams, UserCreateBody, UserPatchBody } from '@/features/users/types'

export const usersQueryKey = (params: ListUsersParams) => ['users', params] as const
export const userDetailQueryKey = (id: string) => ['users', id] as const
export const userLogsQueryKey = (id: string, page: number, pageSize: number) =>
  ['users', id, 'logs', page, pageSize] as const

export function useUsersQuery(params: ListUsersParams, enabled = true) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () => fetchUsers(params),
    enabled,
    staleTime: 15_000,
  })
}

export function useUserDetailQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: userDetailQueryKey(userId),
    queryFn: () => fetchUser(userId),
    enabled: enabled && Boolean(userId),
  })
}

export function useCreateUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UserCreateBody) => createUser(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function usePatchUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UserPatchBody }) => patchUser(userId, body),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: userDetailQueryKey(vars.userId) })
    },
  })
}

export function useUserAuditLogsQuery(userId: string, page: number, pageSize: number, enabled = true) {
  return useQuery({
    queryKey: userLogsQueryKey(userId, page, pageSize),
    queryFn: () => fetchUserAuditLogs(userId, { page, page_size: pageSize }),
    enabled: enabled && Boolean(userId),
  })
}
