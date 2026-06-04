/** Nguồn mở timeline khách hàng — dùng state hoặc query khi điều hướng. */

export type CustomerLogsFrom = 'customers' | 'order'

export type CustomerLogsNavState = {
  from?: CustomerLogsFrom
  orderId?: string
}

export function customerLogsPath(
  customerId: string,
  nav?: CustomerLogsNavState,
): { pathname: string; search?: string; state?: CustomerLogsNavState } {
  if (nav?.from === 'order' && nav.orderId) {
    return {
      pathname: `/admin/customers/${customerId}/logs`,
      search: `?from=order&orderId=${encodeURIComponent(nav.orderId)}`,
      state: nav,
    }
  }
  return {
    pathname: `/admin/customers/${customerId}/logs`,
    state: { from: 'customers' as const },
  }
}

export function resolveCustomerLogsBack(
  state: CustomerLogsNavState | null | undefined,
  searchParams: URLSearchParams,
): { to: string; label: string } {
  const fromQuery = searchParams.get('from')
  const orderIdQuery = searchParams.get('orderId')
  const from = state?.from ?? (fromQuery === 'order' ? 'order' : 'customers')
  const orderId = state?.orderId ?? orderIdQuery ?? ''

  if (from === 'order' && orderId) {
    return {
      to: `/admin/orders/${orderId}`,
      label: 'Quay lại chi tiết đơn hàng',
    }
  }
  return {
    to: '/admin/customers',
    label: 'Quay lại danh sách khách hàng',
  }
}
