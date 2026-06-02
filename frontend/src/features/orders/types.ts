export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid'
export type PaymentMethod = 'offline' | 'vnpay'
export type OfflineSubtype = 'cod' | 'bank'

export type ShippingAddress = {
  full_name: string
  phone: string
  line1: string
  ward: string
  district: string
  city: string
  note?: string | null
}

export type OrderItemPublic = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export type OrderSummary = {
  id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  offline_subtype: OfflineSubtype
  subtotal: number
  discount_amount: number
  total_amount: number
  item_count: number
  created_at: string
  paid_at: string | null
}

export type OrderDetail = OrderSummary & {
  user_id: string
  items: OrderItemPublic[]
  promotion_id: string | null
  promotion_code: string | null
  shipping_address: ShippingAddress
}

export type BankInstructions = {
  bank_name: string
  account_number: string
  account_holder: string
  transfer_note: string
  order_id: string
}

export type VnpayPaymentInfo = {
  payment_url: string
  expires_at: string
  txn_ref: string
}

export type OrderCreateResponse = {
  order: OrderDetail
  bank_instructions: BankInstructions | null
  vnpay: VnpayPaymentInfo | null
}

export type OrderListResponse = {
  items: OrderSummary[]
  total: number
  page: number
  page_size: number
}

export type OrderCreateFromCartBody = {
  shipping_address: ShippingAddress
  payment_method: PaymentMethod
  offline_subtype?: OfflineSubtype
  promotion_code?: string | null
}

export type OrderCreateBuyNowBody = OrderCreateFromCartBody & {
  product_id: string
  quantity: number
}

export type MyOrdersQueryParams = {
  page?: number
  page_size?: number
  status?: OrderStatus
}

/** State truyền từ ProductDetail → Checkout (mua ngay). */
export type CheckoutBuyNowState = {
  mode: 'buyNow'
  productId: string
  quantity: number
  productName: string
  unitPrice: number
  lineTotal: number
  displayImageUrl: string | null
}

export type CheckoutLocationState = CheckoutBuyNowState | { mode: 'cart' }
