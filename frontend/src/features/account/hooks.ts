import { useMutation, useQueryClient } from '@tanstack/react-query'
import { changePassword, patchProfile } from '@/features/account/api'

export function useUpdateProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: patchProfile,
    onSuccess: (user) => {
      qc.setQueryData(['me'], user)
    },
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
  })
}
