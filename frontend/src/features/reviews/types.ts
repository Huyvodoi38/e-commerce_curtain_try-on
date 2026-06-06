export type ReviewSource = 'customer' | 'admin'

export type ReviewPublic = {
  id: string
  product_id: string
  author_name: string
  rating: number
  comment: string | null
  source: ReviewSource
  created_at: string
  updated_at: string
  is_mine: boolean
}

export type ReviewListResponse = {
  items: ReviewPublic[]
  total: number
  page: number
  page_size: number
  pages: number
  my_review: ReviewPublic | null
}

export type ReviewCreateBody = {
  rating: number
  comment?: string | null
}

export type ReviewUpdateBody = ReviewCreateBody

export type AdminReviewPublic = {
  id: string
  product_id: string
  product_name: string
  user_id: string | null
  author_name: string
  rating: number
  comment: string | null
  source: ReviewSource
  created_at: string
  updated_at: string
}

export type AdminReviewListResponse = {
  items: AdminReviewPublic[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type AdminReviewCreateBody = {
  product_id: string
  author_name: string
  rating: number
  comment?: string | null
}
