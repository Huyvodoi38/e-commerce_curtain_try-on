import { apiClient } from '@/lib/api/client'
import type {
  TryOnHistoryResponse,
  TryOnPreviewResponse,
  TryOnSaveResponse,
} from '@/features/try-on/types'

export async function previewTryOn(params: {
  productId: string
  roomImage: File
  bbox: { x_min: number; y_min: number; x_max: number; y_max: number }
}): Promise<TryOnPreviewResponse> {
  const form = new FormData()
  form.append('product_id', params.productId)
  form.append('room_image', params.roomImage)
  form.append('x_min', String(params.bbox.x_min))
  form.append('y_min', String(params.bbox.y_min))
  form.append('x_max', String(params.bbox.x_max))
  form.append('y_max', String(params.bbox.y_max))

  const { data } = await apiClient.post<TryOnPreviewResponse>('/ai/try-on/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180_000,
  })
  return data
}

export async function saveTryOn(params: {
  productId: string
  roomImage: File
  resultImage: File
  bbox: { x_min: number; y_min: number; x_max: number; y_max: number }
}): Promise<TryOnSaveResponse> {
  const form = new FormData()
  form.append('product_id', params.productId)
  form.append('room_image', params.roomImage)
  form.append('result_image', params.resultImage)
  form.append('x_min', String(params.bbox.x_min))
  form.append('y_min', String(params.bbox.y_min))
  form.append('x_max', String(params.bbox.x_max))
  form.append('y_max', String(params.bbox.y_max))

  const { data } = await apiClient.post<TryOnSaveResponse>('/ai/try-on/save', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
  return data
}

export async function fetchTryOnHistory(params: {
  page?: number
  page_size?: number
}): Promise<TryOnHistoryResponse> {
  const { data } = await apiClient.get<TryOnHistoryResponse>('/ai/history', { params })
  return data
}

export function base64ToFile(base64: string, filename: string, mimeType = 'image/png'): File {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], filename, { type: mimeType })
}
