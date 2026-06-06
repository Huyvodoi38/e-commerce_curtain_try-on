import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormField, inputClassName } from '@/components/form/FormField'
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/account/schemas'
import { useChangePasswordMutation } from '@/features/account/hooks'
import { useMeQuery } from '@/features/auth/hooks'
import { getErrorMessage } from '@/lib/api/client'

export function AccountSecurityPage() {
  const meQuery = useMeQuery()
  const changePassword = useChangePasswordMutation()
  const isGoogle = meQuery.data?.auth_provider === 'google'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      reset()
    } catch {
      // error shown below
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-6">
      <h2 className="text-lg font-semibold text-foreground">Bảo mật</h2>
      <p className="mt-1 text-sm text-foreground-muted">Quản lý mật khẩu và phương thức đăng nhập.</p>

      {isGoogle ? (
        <div className="mt-6 max-w-md rounded-lg border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-foreground-muted">
          Bạn đăng nhập bằng Google. Mật khẩu được quản lý trên tài khoản Google — không thể đổi tại
          đây.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-md space-y-4">
          <FormField
            label="Mật khẩu hiện tại"
            htmlFor="current_password"
            error={errors.current_password?.message}
          >
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              className={inputClassName}
              {...register('current_password')}
            />
          </FormField>

          <FormField
            label="Mật khẩu mới"
            htmlFor="new_password"
            error={errors.new_password?.message}
          >
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...register('new_password')}
            />
          </FormField>

          <FormField
            label="Xác nhận mật khẩu mới"
            htmlFor="confirm_password"
            error={errors.confirm_password?.message}
          >
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...register('confirm_password')}
            />
          </FormField>

          {changePassword.isError ? (
            <p className="rounded-md border border-danger-700/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {getErrorMessage(changePassword.error)}
            </p>
          ) : null}

          {changePassword.isSuccess && !changePassword.isPending ? (
            <p className="rounded-md border border-success-700/20 bg-success-50 px-3 py-2 text-sm text-success-700">
              Đã đổi mật khẩu thành công.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={changePassword.isPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {changePassword.isPending ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </button>
        </form>
      )}
    </section>
  )
}
