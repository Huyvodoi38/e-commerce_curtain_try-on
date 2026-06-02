import { apiClient } from '@/lib/api/client'
import {
  clearAccessToken,
  getAccessToken,
  revokeAuthSession,
  setAccessToken,
} from '@/lib/auth/tokenStore'
import {
  clearSessionHint,
  hasSessionHint,
  markHasSession,
} from '@/lib/auth/sessionHint'
import type { UserPublic } from '@/types/auth'

export type TokenResponse = {
  access_token: string
  token_type: string
  user?: UserPublic
}

export async function fetchMe(): Promise<UserPublic> {
  const { data } = await apiClient.get<UserPublic>('/auth/me')
  return data
}

export async function refreshSession(): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/refresh')
  setAccessToken(data.access_token)
  markHasSession()
  return data
}

let restoreSessionPromise: Promise<TokenResponse | null> | null = null

/** Khôi phục session khi mở app — guest chưa từng login thì không gọi API. */
export async function tryRestoreSession(): Promise<TokenResponse | null> {
  if (!hasSessionHint() && !getAccessToken()) {
    return null
  }

  if (!restoreSessionPromise) {
    restoreSessionPromise = refreshSession()
      .catch(() => {
        clearAccessToken()
        clearSessionHint()
        return null
      })
      .finally(() => {
        restoreSessionPromise = null
      })
  }

  return restoreSessionPromise
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { username, password })
  setAccessToken(data.access_token)
  markHasSession()
  return data
}

export async function register(payload: {
  username: string
  password: string
  full_name: string
}): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/register', payload)
  setAccessToken(data.access_token)
  markHasSession()
  return data
}

export async function logout(): Promise<void> {
  revokeAuthSession()
  clearSessionHint()
  try {
    await apiClient.post('/auth/logout')
  } finally {
    clearAccessToken()
    clearSessionHint()
  }
}
