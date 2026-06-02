import { googleLoginUrl } from '@/lib/auth/googleAuth'

type Props = {
  redirect?: string | null
}

export function GoogleSignInLink({ redirect }: Props) {
  return (
    <a
      href={googleLoginUrl(redirect)}
      className="block w-full rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground-muted hover:bg-surface-muted"
    >
      Đăng nhập bằng Google
    </a>
  )
}
