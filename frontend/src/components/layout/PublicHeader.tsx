import { Link } from 'react-router-dom'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { CartHeaderLink } from '@/components/layout/CartHeaderLink'
import { CategoryNav } from '@/components/layout/CategoryNav'
import { HeaderSearch } from '@/components/layout/HeaderSearch'
import { useMeQuery } from '@/features/auth/hooks'

export function PublicHeader() {
  const { data: user } = useMeQuery()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-raised shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="shrink-0 text-lg font-bold tracking-tight text-brand">
          Curtain AI TryOn
        </Link>

        <HeaderSearch />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-2.5 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted sm:px-3"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="hidden rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover sm:inline-block"
              >
                Đăng ký
              </Link>
            </>
          )}

          <CartHeaderLink />
        </div>
      </div>

      <CategoryNav />
    </header>
  )
}
