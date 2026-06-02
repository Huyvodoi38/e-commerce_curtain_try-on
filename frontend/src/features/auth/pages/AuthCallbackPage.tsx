import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageShell } from '@/components/common/PageShell'
import { fetchMe, refreshSession } from '@/features/auth/api'
import { getPostLoginPath } from '@/lib/auth/redirects'
import { markHasSession } from '@/lib/auth/sessionHint'
import { setAccessToken } from '@/lib/auth/tokenStore'

function readAccessTokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('access_token')
}

function stripTokenFromUrl(): void {
  const path = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', path)
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const redirect = searchParams.get('redirect')

  useEffect(() => {
    let cancelled = false

    async function completeOAuth() {
      const tokenFromHash = readAccessTokenFromHash(location.hash)

      try {
        if (tokenFromHash) {
          setAccessToken(tokenFromHash)
          markHasSession()
          stripTokenFromUrl()
          const user = await fetchMe()
          queryClient.setQueryData(['me'], user)
          if (!cancelled) {
            navigate(getPostLoginPath(user.role, redirect), { replace: true })
          }
          return
        }

        const data = await refreshSession()
        if (data.user) {
          queryClient.setQueryData(['me'], data.user)
        } else {
          await queryClient.invalidateQueries({ queryKey: ['me'] })
        }
        if (!cancelled) {
          navigate(getPostLoginPath(data.user?.role ?? 'customer', redirect), { replace: true })
        }
      } catch {
        if (!cancelled) {
          const qs = redirect ? `?error=google&redirect=${encodeURIComponent(redirect)}` : '?error=google'
          navigate(`/login${qs}`, { replace: true })
        }
      }
    }

    void completeOAuth()

    return () => {
      cancelled = true
    }
  }, [location.hash, navigate, queryClient, redirect])

  return (
    <PageShell title="Đang xử lý đăng nhập">
      <p className="text-center text-sm text-foreground-muted">Đang hoàn tất đăng nhập Google…</p>
    </PageShell>
  )
}
