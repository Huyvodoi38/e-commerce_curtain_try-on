import axios, { type InternalAxiosRequestConfig } from 'axios'

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }
import {
  clearAccessToken,
  getAccessToken,
  isAuthSessionRevoked,
  setAccessToken,
} from '@/lib/auth/tokenStore'

const baseURL = import.meta.env.VITE_API_URL ?? ''

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableConfig | undefined
    const requestUrl = original?.url ?? ''

    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Đã logout — không tự refresh (tránh “đăng nhập lại” sau khi xóa access token)
    if (isAuthSessionRevoked()) {
      return Promise.reject(error)
    }

    // Không retry refresh cho auth endpoints
    if (
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/logout')
    ) {
      return Promise.reject(error)
    }

    original._retry = true

    if (!refreshPromise) {
      refreshPromise = apiClient
        .post<{ access_token: string }>('/auth/refresh')
        .then((res) => {
          const token = res.data.access_token
          setAccessToken(token)
          return token
        })
        .catch(() => {
          clearAccessToken()
          return null
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const token = await refreshPromise
    if (!token) {
      return Promise.reject(error)
    }

    original.headers.Authorization = `Bearer ${token}`
    return apiClient(original)
  },
)

export type ApiError = {
  detail?: string
  message?: string
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data as { detail?: unknown } | undefined
    const value = detail?.detail
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(String).join(', ')
  }
  return 'Đã xảy ra lỗi'
}
