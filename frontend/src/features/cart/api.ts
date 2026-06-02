import { apiClient } from '@/lib/api/client'
import type { CartResponse } from '@/features/cart/types'

export async function fetchCart(): Promise<CartResponse> {
  const { data } = await apiClient.get<CartResponse>('/cart')
  return data
}

export async function addCartItem(productId: string, quantity: number): Promise<CartResponse> {
  const { data } = await apiClient.post<CartResponse>('/cart/items', {
    product_id: productId,
    quantity,
  })
  return data
}

export async function patchCartItemQuantity(
  productId: string,
  quantity: number,
): Promise<CartResponse> {
  const { data } = await apiClient.patch<CartResponse>(`/cart/items/${productId}`, { quantity })
  return data
}

export async function deleteCartItem(productId: string): Promise<CartResponse> {
  const { data } = await apiClient.delete<CartResponse>(`/cart/items/${productId}`)
  return data
}

export async function clearCart(): Promise<CartResponse> {
  const { data } = await apiClient.delete<CartResponse>('/cart')
  return data
}
