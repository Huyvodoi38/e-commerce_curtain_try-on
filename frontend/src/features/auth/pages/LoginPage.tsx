import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { FormField, inputClassName } from '@/components/form/FormField'
import { GoogleSignInLink } from '@/features/auth/components/GoogleSignInLink'
import { useLoginMutation } from '@/features/auth/hooks'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas'
import { getErrorMessage } from '@/lib/api/client'
import { getGoogleAuthErrorMessage } from '@/lib/auth/googleAuth'
import { getPostLoginPath } from '@/lib/auth/redirects'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const googleError = getGoogleAuthErrorMessage(searchParams.get('error'))
  const loginMutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await loginMutation.mutateAsync({
        username: values.username.trim().toLowerCase(),
        password: values.password,
      })
      const role = result.user?.role ?? 'customer'
      navigate(getPostLoginPath(role, redirect), { replace: true })
    } catch {
      // mutation error shown below
    }
  }

  const registerHref = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register'

  return (
    <PageShell title="Đăng nhập" description="Đăng nhập bằng tên đăng nhập và mật khẩu">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-surface-raised p-6"
      >
        {googleError ? (
          <p className="rounded-md border border-danger-700/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {googleError}
          </p>
        ) : null}

        <FormField label="Tên đăng nhập" htmlFor="username" error={errors.username?.message}>
          <input
            id="username"
            type="text"
            autoComplete="username"
            className={inputClassName}
            {...register('username')}
          />
        </FormField>

        <FormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={inputClassName}
            {...register('password')}
          />
        </FormField>

        {loginMutation.isError ? (
          <p className="rounded-md border border-danger-700/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {getErrorMessage(loginMutation.error)}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loginMutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        <GoogleSignInLink redirect={redirect} />
      </form>

      <p className="mx-auto mt-4 max-w-md text-center text-sm text-foreground-muted">
        Chưa có tài khoản?{' '}
        <Link to={registerHref} className="font-medium text-brand hover:underline">
          Đăng ký
        </Link>
      </p>
    </PageShell>
  )
}
