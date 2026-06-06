import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTryOnHistory, previewTryOn, saveTryOn } from '@/features/try-on/api'

export function usePreviewTryOnMutation() {
  return useMutation({
    mutationFn: previewTryOn,
  })
}

export function useSaveTryOnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveTryOn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['try-on', 'history'] })
    },
  })
}

export function useTryOnHistoryQuery(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['try-on', 'history', page, pageSize],
    queryFn: () => fetchTryOnHistory({ page, page_size: pageSize }),
  })
}
