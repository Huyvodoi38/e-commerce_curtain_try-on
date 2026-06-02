import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tryRestoreSession } from '@/features/auth/api'
import { clearAccessToken } from '@/lib/auth/tokenStore'

type Props = {
  children: ReactNode
}

export function AuthBootstrap({ children }: Props) {
  const queryClient = useQueryClient()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const data = await tryRestoreSession()
        if (data?.user) {
          queryClient.setQueryData(['me'], data.user)
        }
      } catch {
        clearAccessToken()
        queryClient.removeQueries({ queryKey: ['me'] })
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [queryClient])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-foreground-subtle">
        Đang tải…
      </div>
    )
  }

  return children
}
