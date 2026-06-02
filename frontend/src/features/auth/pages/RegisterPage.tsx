import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/common/PageShell'
import { FormField, inputClassName } from '@/components/form/FormField'
import { useRegisterMutation } from '@/features/auth/hooks'
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas'
import { GoogleSignInLink } from '@/features/auth/components/GoogleSignInLink'
import { getErrorMessage } from '@/lib/api/client'
import { getPostLoginPath } from '@/lib/auth/redirects'

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const registerMutation = useRegisterMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', full_name: '' },
  })

  async function onSubmit(values: RegisterFormValues) {
    try {
      const result = await registerMutation.mutateAsync({
        username: values.username.trim().toLowerCase(),
        password: values.password,
        full_name: values.full_name.trim(),
      })
      const role = result.user?.role ?? 'customer'
      navigate(getPostLoginPath(role, redirect), { replace: true })
    } catch {
      // mutation error shown below
    }
  }

  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'

  return (
    <PageShell title="Đăng ký" description="Tạo tài khoản khách hàng">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-surface-raised p-6"
      >
        <FormField label="Họ tên" htmlFor="full_name" error={errors.full_name?.message}>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            className={inputClassName}
            {...register('full_name')}
          />
        </FormField>

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
            autoComplete="new-password"
            className={inputClassName}
            {...register('password')}
          />
        </FormField>

        {registerMutation.isError ? (
          <p className="rounded-md border border-danger-700/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {getErrorMessage(registerMutation.error)}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {registerMutation.isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>

        <GoogleSignInLink redirect={redirect} />
      </form>

      <p className="mx-auto mt-4 max-w-md text-center text-sm text-foreground-muted">
        Đã có tài khoản?{' '}
        <Link to={loginHref} className="font-medium text-brand hover:underline">
          Đăng nhập
        </Link>
      </p>
    </PageShell>
  )
}
