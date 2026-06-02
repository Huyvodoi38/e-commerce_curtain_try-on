import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLogoutMutation } from '@/features/auth/hooks'
import { canAccessAdmin } from '@/lib/permissions/permissions'
import type { UserPublic } from '@/types/auth'

type Props = {
  user: UserPublic
}

export function AccountMenu({ user }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const logoutMutation = useLogoutMutation()

  const displayName = user.username || user.email || user.full_name || 'Tài khoản'
  const isAdmin = canAccessAdmin(user.role)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleLogout() {
    setOpen(false)
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // Vẫn thoát session local nếu API lỗi
    }
    window.location.assign('/')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[160px] items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted sm:max-w-[180px] sm:px-2.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <span className="truncate">{displayName}</span>
        <ChevronIcon className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-surface-raised py-1 shadow-lg"
        >
          {isAdmin ? (
            <AccountMenuLink to="/admin/orders" onNavigate={() => setOpen(false)}>
              Quản trị
            </AccountMenuLink>
          ) : (
            <>
              <AccountMenuLink to="/orders" onNavigate={() => setOpen(false)}>
                Đơn hàng
              </AccountMenuLink>
              <MenuDivider />
              <AccountMenuSoon label="Quản lý tài khoản" />
              <AccountMenuSoon label="Lịch sử Try-on" />
            </>
          )}

          <MenuDivider />
          <button
            type="button"
            role="menuitem"
            disabled={logoutMutation.isPending}
            onClick={() => void handleLogout()}
            className="flex w-full px-4 py-2.5 text-left text-sm text-danger-700 hover:bg-danger-50 disabled:opacity-50"
          >
            {logoutMutation.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function AccountMenuLink({
  to,
  children,
  onNavigate,
}: {
  to: string
  children: ReactNode
  onNavigate: () => void
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onNavigate}
      className="block px-4 py-2.5 text-sm text-foreground hover:bg-surface-muted"
    >
      {children}
    </Link>
  )
}

function AccountMenuSoon({ label }: { label: string }) {
  return (
    <span
      role="menuitem"
      aria-disabled="true"
      className="flex cursor-not-allowed items-center justify-between px-4 py-2.5 text-sm text-foreground-subtle"
      title="Tính năng sắp ra mắt"
    >
      {label}
      <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-subtle/80">
        Sắp có
      </span>
    </span>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-border-subtle" role="separator" />
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
