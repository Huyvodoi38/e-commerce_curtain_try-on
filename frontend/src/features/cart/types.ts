export type CartLineItem = {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  line_total: number
  stock: number
  display_image_url: string | null
}

export type CartResponse = {
  items: CartLineItem[]
  subtotal: number
  item_count: number
  updated_at: string
  removed_product_ids: string[]
}
