export type TryOnBBox = {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

export type TryOnPreviewResponse = {
  result_image_base64: string
  product_id: string
  bbox: TryOnBBox
}

export type TryOnSaveResponse = {
  id: string
  product_id: string
  original_room_url: string
  result_url: string
  created_at: string
}

export type TryOnHistoryItem = {
  id: string
  product_id: string
  product_name: string | null
  original_room_url: string
  result_url: string | null
  created_at: string
}

export type TryOnHistoryResponse = {
  items: TryOnHistoryItem[]
  total: number
  page: number
  page_size: number
  pages: number
}
