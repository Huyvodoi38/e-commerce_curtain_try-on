/** Base URL API — dev để trống (Vite proxy); production: https://api.example.com */

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
}

export function isCrossOriginApi(): boolean {
  return getApiBaseUrl().length > 0
}

/** @deprecated Dùng `googleLoginUrl` từ `@/lib/auth/googleAuth` */
export { googleLoginUrl } from '@/lib/auth/googleAuth'
