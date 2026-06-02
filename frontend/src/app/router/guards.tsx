import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { loginPathWithRedirect } from '@/lib/auth/paths'
import { getPostLoginPath } from '@/lib/auth/redirects'
import { useMeQuery } from '@/features/auth/hooks'
import { canAccessAdmin } from '@/lib/permissions/permissions'
import type { UserRole } from '@/types/auth'

function LoadingScreen() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-foreground-subtle">
      Đang tải…
    </div>
  )
}

export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const location = useLocation()
  const { data: user, isLoading, isError } = useMeQuery()

  if (isLoading) return <LoadingScreen />
  if (isError || !user) {
    return (
      <Navigate
        to={loginPathWithRedirect(`${location.pathname}${location.search}`)}
        replace
      />
    )
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}

export function RequireAdmin() {
  const location = useLocation()
  const { data: user, isLoading, isError } = useMeQuery()

  if (isLoading) return <LoadingScreen />
  if (isError || !user) {
    return (
      <Navigate
        to={loginPathWithRedirect(`${location.pathname}${location.search}`)}
        replace
      />
    )
  }
  if (!canAccessAdmin(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}

export function GuestOnly() {
  const { data: user, isLoading } = useMeQuery()
  const [searchParams] = useSearchParams()

  if (isLoading) return <LoadingScreen />
  if (user) {
    return <Navigate to={getPostLoginPath(user.role, searchParams.get('redirect'))} replace />
  }

  return <Outlet />
}
