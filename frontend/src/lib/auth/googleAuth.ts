import { sanitizeRedirectPath } from '@/lib/auth/redirects'

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
  google_config: 'Đăng nhập Google chưa được cấu hình trên máy chủ.',
  google_unverified: 'Email Google chưa được xác minh. Hãy xác minh email trên tài khoản Google.',
  google_email_conflict:
    'Email này đã dùng cho tài khoản đăng ký bằng tên đăng nhập. Hãy đăng nhập bằng mật khẩu.',
  google_disabled: 'Tài khoản đã bị vô hiệu hóa.',
  google_no_email: 'Google không cung cấp email cho tài khoản này.',
}

export function getGoogleAuthErrorMessage(code: string | null): string | null {
  if (!code) return null
  return GOOGLE_ERROR_MESSAGES[code] ?? GOOGLE_ERROR_MESSAGES.google
}

/** URL bắt đầu luồng Google OAuth — cùng origin trình duyệt (dev proxy). */
export function googleLoginUrl(redirect?: string | null): string {
  const safe = sanitizeRedirectPath(redirect)
  const params = safe ? `?redirect=${encodeURIComponent(safe)}` : ''

  const base = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
  if (base) return `${base}/auth/google/login${params}`
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/google/login${params}`
  }
  return `/auth/google/login${params}`
}
