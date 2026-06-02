import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCartItem,
  clearCart,
  deleteCartItem,
  fetchCart,
  patchCartItemQuantity,
} from '@/features/cart/api'
import type { CartResponse } from '@/features/cart/types'

export const cartQueryKey = ['cart'] as const

export function useCartQuery(enabled: boolean) {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: fetchCart,
    enabled,
    staleTime: 30_000,
  })
}

function useCartMutation<TArgs, TResult extends CartResponse>(
  mutationFn: (args: TArgs) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(cartQueryKey, data)
    },
  })
}

export function useAddCartItemMutation() {
  return useCartMutation(({ productId, quantity }: { productId: string; quantity: number }) =>
    addCartItem(productId, quantity),
  )
}

export function usePatchCartItemMutation() {
  return useCartMutation(({ productId, quantity }: { productId: string; quantity: number }) =>
    patchCartItemQuantity(productId, quantity),
  )
}

export function useDeleteCartItemMutation() {
  return useCartMutation((productId: string) => deleteCartItem(productId))
}

export function useClearCartMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: clearCart,
    onSuccess: (data) => {
      queryClient.setQueryData(cartQueryKey, data)
    },
  })
}
