import { apiClient } from '@/lib/api/client'
import type { MediaUploadResponse } from '@/features/media/types'

export async function deleteCloudinaryAsset(url: string): Promise<void> {
  await apiClient.delete('/media/asset', { data: { url } })
}

export async function uploadProductImage(file: File): Promise<MediaUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<MediaUploadResponse>(
    '/media/upload',
    form,
    {
      params: { folder: 'products' },
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return data
}
