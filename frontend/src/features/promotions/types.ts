export type DiscountType = 'percentage' | 'fixed'

export type PromotionSummary = {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_value: number
  start_date: string
  end_date: string
  is_active: boolean
  used_count: number
  usage_limit: number | null
}

export type PromotionDetail = PromotionSummary & {
  max_discount_amount: number | null
}

export type PromotionListResponse = {
  items: PromotionSummary[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type PromotionValidateResponse = {
  valid: boolean
  promotion_id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  subtotal: number
  total_after_discount: number
  message: string
}

export type PromotionCreateBody = {
  code: string
  description?: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_value: number
  max_discount_amount?: number | null
  start_date: string
  end_date: string
  usage_limit?: number | null
  is_active?: boolean
}

export type PromotionPatchBody = {
  code?: string
  description?: string | null
  discount_type?: DiscountType
  discount_value?: number
  min_order_value?: number
  max_discount_amount?: number | null
  start_date?: string
  end_date?: string
  usage_limit?: number | null
  is_active?: boolean
}
