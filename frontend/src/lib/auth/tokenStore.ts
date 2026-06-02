import { useSyncExternalStore } from 'react'

let accessToken: string | null = null
/** Sau logout: chặn interceptor refresh tạo session mới từ cookie cũ */
let sessionRevoked = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) {
    sessionRevoked = false
  }
  notify()
}

export function clearAccessToken(): void {
  accessToken = null
  notify()
}

/** Gọi khi bắt đầu logout — trước khi xóa refresh cookie trên server */
export function revokeAuthSession(): void {
  sessionRevoked = true
  accessToken = null
  notify()
}

export function isAuthSessionRevoked(): boolean {
  return sessionRevoked
}

export function subscribeAccessToken(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAccessToken(): string | null {
  return useSyncExternalStore(subscribeAccessToken, getAccessToken, () => null)
}

export function useIsLoggedIn(): boolean {
  return Boolean(useAccessToken())
}
