import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthBootstrapState } from '@/app/providers/useAuthBootstrapState'
import { clearAccessToken, revokeAuthSession, useIsLoggedIn } from '@/lib/auth/tokenStore'
import { clearSessionHint } from '@/lib/auth/sessionHint'
import { fetchMe, login, logout, register } from './api'

export function useMeQuery(enabled = true) {
  const { isBootstrapping } = useAuthBootstrapState()
  const isLoggedIn = useIsLoggedIn()

  const query = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: enabled && isLoggedIn,
    retry: false,
  })

  if (!isLoggedIn) {
    if (isBootstrapping) {
      return { ...query, data: undefined, isLoading: true, isError: false, isFetching: true }
    }
    return { ...query, data: undefined, isLoading: false, isError: false, isFetching: false }
  }

  return query
}

function syncMeOnAuthSuccess(
  qc: ReturnType<typeof useQueryClient>,
  data: Awaited<ReturnType<typeof login>>,
) {
  if (data.user) {
    qc.setQueryData(['me'], data.user)
  } else {
    void qc.invalidateQueries({ queryKey: ['me'] })
  }
}

export function useLoginMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (data) => syncMeOnAuthSuccess(qc, data),
  })
}

export function useRegisterMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => syncMeOnAuthSuccess(qc, data),
  })
}

export function useLogoutMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onMutate: () => {
      revokeAuthSession()
      clearSessionHint()
    },
    onSuccess: () => {
      clearAccessToken()
      qc.removeQueries({ queryKey: ['me'] })
      qc.removeQueries({ queryKey: ['cart'] })
      qc.clear()
    },
    onError: () => {
      clearAccessToken()
      qc.removeQueries({ queryKey: ['me'] })
      qc.removeQueries({ queryKey: ['cart'] })
    },
  })
}
