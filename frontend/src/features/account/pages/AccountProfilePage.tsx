import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormField, inputClassName } from '@/components/form/FormField'
import { profileSchema, type ProfileFormValues } from '@/features/account/schemas'
import { useUpdateProfileMutation } from '@/features/account/hooks'
import { useMeQuery } from '@/features/auth/hooks'
import { getErrorMessage } from '@/lib/api/client'

export function AccountProfilePage() {
  const meQuery = useMeQuery()
  const updateProfile = useUpdateProfileMutation()
  const user = meQuery.data

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '' },
  })

  useEffect(() => {
    if (user) {
      reset({ full_name: user.full_name })
    }
  }, [user, reset])

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateProfile.mutateAsync({ full_name: values.full_name.trim() })
    } catch {
      // error shown below
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-6">
      <h2 className="text-lg font-semibold text-foreground">Hồ sơ</h2>
      <p className="mt-1 text-sm text-foreground-muted">Cập nhật thông tin hiển thị của bạn.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-md space-y-4">
        <FormField label="Họ tên" htmlFor="full_name" error={errors.full_name?.message}>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            className={inputClassName}
            {...register('full_name')}
          />
        </FormField>

        {user?.username ? (
          <FormField label="Tên đăng nhập" htmlFor="username">
            <input
              id="username"
              type="text"
              readOnly
              value={user.username}
              className={`${inputClassName} cursor-not-allowed bg-surface-muted text-foreground-muted`}
            />
            <p className="mt-1 text-xs text-foreground-subtle">Không thể thay đổi tên đăng nhập.</p>
          </FormField>
        ) : null}

        {user?.email ? (
          <FormField label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              readOnly
              value={user.email}
              className={`${inputClassName} cursor-not-allowed bg-surface-muted text-foreground-muted`}
            />
            {user.email_verified ? (
              <p className="mt-1 text-xs text-success-700">Email đã xác minh qua Google.</p>
            ) : null}
          </FormField>
        ) : null}

        {updateProfile.isError ? (
          <p className="rounded-md border border-danger-700/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {getErrorMessage(updateProfile.error)}
          </p>
        ) : null}

        {updateProfile.isSuccess && !updateProfile.isPending && !isDirty ? (
          <p className="rounded-md border border-success-700/20 bg-success-50 px-3 py-2 text-sm text-success-700">
            Đã lưu thay đổi.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={updateProfile.isPending || !isDirty}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </form>
    </section>
  )
}
