export function formatUserLogin(username: string | null, email: string | null): string {
  return username ?? email ?? '—'
}

export function formatDateTimeVi(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const ACTION_LABELS: Record<string, string> = {
  'user.registered': 'Đăng ký tài khoản',
  'user.registered_google': 'Đăng ký qua Google',
  'user.created': 'Tài khoản được tạo',
  'user.updated': 'Cập nhật thông tin',
  'user.deactivated': 'Vô hiệu hóa',
  'user.activated': 'Kích hoạt lại',
  'order.created': 'Tạo đơn hàng',
  'order.payment_confirmed': 'Xác nhận thanh toán',
  'order.shipped': 'Giao hàng',
  'order.delivered': 'Hoàn thành đơn',
  'order.cancelled': 'Hủy đơn',
  'order.cancelled_by_staff': 'Nhân viên hủy đơn',
}

export function activityActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

type ActivityLogLike = {
  id: string
  actor_id: string
  customer_id?: string | null
  target_user_id?: string | null
  order_id?: string | null
  metadata: Record<string, unknown>
}

/** Dòng chi tiết ID cho timeline (staff / customer). */
export function formatLogDetailLines(log: ActivityLogLike, pageUserId?: string): string[] {
  const lines: string[] = [`Mã log: ${log.id}`]
  const staffId =
    typeof log.metadata.staff_id === 'string'
      ? log.metadata.staff_id
      : log.actor_id === pageUserId
        ? log.actor_id
        : null

  if (staffId) {
    lines.push(`Mã nhân viên: ${staffId}`)
  }
  if (log.actor_id && log.actor_id !== pageUserId) {
    lines.push(`Người thực hiện: ${log.actor_id}`)
  }
  if (log.customer_id) {
    lines.push(`Khách hàng: ${log.customer_id}`)
  }
  if (log.target_user_id && log.target_user_id !== pageUserId) {
    lines.push(`Tài khoản đích: ${log.target_user_id}`)
  }
  if (log.order_id) {
    lines.push(`Đơn hàng: ${log.order_id}`)
  }
  return lines
}
