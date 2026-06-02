import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelMyOrder,
  createOrderBuyNow,
  createOrderFromCart,
  createVnpayPayment,
  fetchMyOrder,
  fetchMyOrders,
} from '@/features/orders/api'
import { cartQueryKey } from '@/features/cart/hooks'
import type {
  MyOrdersQueryParams,
  OrderCreateBuyNowBody,
  OrderCreateFromCartBody,
  OrderDetail,
} from '@/features/orders/types'
import { validatePromotionCode } from '@/features/promotions/api'

export const myOrdersQueryKey = (params: MyOrdersQueryParams) => ['orders', params] as const
export const myOrderDetailQueryKey = (id: string) => ['orders', id] as const

export function useMyOrdersQuery(params: MyOrdersQueryParams, enabled = true) {
  return useQuery({
    queryKey: myOrdersQueryKey(params),
    queryFn: () => fetchMyOrders(params),
    enabled,
    staleTime: 20_000,
  })
}

export function useMyOrderDetailQuery(
  orderId: string,
  enabled = true,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: myOrderDetailQueryKey(orderId),
    queryFn: () => fetchMyOrder(orderId),
    enabled: enabled && Boolean(orderId),
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval,
  })
}

export function useCreateVnpayPaymentMutation(orderId: string) {
  return useMutation({
    mutationFn: () => createVnpayPayment(orderId),
  })
}

function invalidateOrderLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['orders'] })
}

export function useCreateOrderFromCartMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: OrderCreateFromCartBody) => createOrderFromCart(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartQueryKey })
      invalidateOrderLists(queryClient)
    },
  })
}

export function useCreateBuyNowOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: OrderCreateBuyNowBody) => createOrderBuyNow(body),
    onSuccess: () => {
      invalidateOrderLists(queryClient)
    },
  })
}

export function useCancelMyOrderMutation(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelMyOrder(orderId),
    onSuccess: (data: OrderDetail) => {
      queryClient.setQueryData(myOrderDetailQueryKey(orderId), data)
      invalidateOrderLists(queryClient)
    },
  })
}

export function useValidatePromotionMutation() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      validatePromotionCode(code, subtotal),
  })
}
