import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { PageShell } from '@/components/common/PageShell'
import { inputClassName } from '@/components/form/FormField'
import { CartRemovedAlert } from '@/features/cart/components/CartRemovedAlert'
import { useCartQuery } from '@/features/cart/hooks'
import { CheckoutSuccessPanel } from '@/features/orders/components/CheckoutSuccessPanel'
import { ShippingAddressFields } from '@/features/orders/components/ShippingAddressFields'
import {
  useCreateBuyNowOrderMutation,
  useCreateOrderFromCartMutation,
  useValidatePromotionMutation,
} from '@/features/orders/hooks'
import {
  checkoutSchema,
  SHIPPING_ADDRESS_STORAGE_KEY,
  type CheckoutFormValues,
} from '@/features/orders/schemas'
import type { CheckoutBuyNowState, OrderCreateResponse } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/client'
import {
  buildShippingAddressFromForm,
  resolveShippingAdminIds,
} from '@/lib/vietnam-admin/hooks'
import { formatVnd } from '@/lib/utils/formatCurrency'
import { saveBankInstructions } from '@/lib/orders/bankInstructionsStore'

function isBuyNowState(state: unknown): state is CheckoutBuyNowState {
  if (!state || typeof state !== 'object') return false
  const s = state as CheckoutBuyNowState
  return s.mode === 'buyNow' && Boolean(s.productId) && s.quantity >= 1
}

type SavedShippingV2 = Partial<CheckoutFormValues>
type SavedShippingV1 = Partial<CheckoutFormValues> & { city?: string; ward?: string }

function loadSavedShipping(): SavedShippingV2 | undefined {
  try {
    const raw = localStorage.getItem(SHIPPING_ADDRESS_STORAGE_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as SavedShippingV2
  } catch {
    return undefined
  }
}

function loadLegacyShippingV1(): SavedShippingV1 | undefined {
  try {
    const raw = localStorage.getItem('curtain_checkout_shipping_v1')
    if (!raw) return undefined
    return JSON.parse(raw) as SavedShippingV1
  } catch {
    return undefined
  }
}

function saveShipping(values: CheckoutFormValues) {
  const address = {
    full_name: values.full_name,
    phone: values.phone,
    line1: values.line1,
    province_id: values.province_id,
    commune_id: values.commune_id,
    note: values.note,
    payment_method: values.payment_method,
  }
  try {
    localStorage.setItem(SHIPPING_ADDRESS_STORAGE_KEY, JSON.stringify(address))
  } catch {
    // ignore quota errors
  }
}

export function CheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const buyNow = isBuyNowState(location.state) ? location.state : null
  const isBuyNow = Boolean(buyNow)

  const cartQuery = useCartQuery(!isBuyNow)
  const createFromCart = useCreateOrderFromCartMutation()
  const createBuyNow = useCreateBuyNowOrderMutation()
  const validatePromotion = useValidatePromotionMutation()
  const [success, setSuccess] = useState<OrderCreateResponse | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [promotionFeedback, setPromotionFeedback] = useState<string | null>(null)
  const [promotionDiscount, setPromotionDiscount] = useState<number>(0)

  const saved = useMemo(() => loadSavedShipping() ?? loadLegacyShippingV1(), [])

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      full_name: saved?.full_name ?? '',
      phone: saved?.phone ?? '',
      line1: saved?.line1 ?? '',
      province_id: saved?.province_id ?? '',
      commune_id: saved?.commune_id ?? '',
      note: saved?.note ?? '',
      payment_method: 'offline',
      offline_subtype: 'cod',
      promotion_code: '',
    },
  })

  const paymentMethod = watch('payment_method')
  const offlineSubtype = watch('offline_subtype')
  const promotionCode = watch('promotion_code')
  const isSubmitting = createFromCart.isPending || createBuyNow.isPending
  const subtotal = isBuyNow && buyNow ? buyNow.lineTotal : (cartQuery.data?.subtotal ?? 0)

  useEffect(() => {
    const legacy = saved as SavedShippingV1 | undefined
    if (legacy?.province_id || !legacy?.city) return
    let cancelled = false
    void resolveShippingAdminIds(legacy.city, legacy.ward).then((resolved) => {
      if (cancelled || !resolved) return
      setValue('province_id', resolved.provinceId)
      if (resolved.communeId) {
        setValue('commune_id', resolved.communeId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [saved, setValue])

  useEffect(() => {
    if (!isBuyNow && cartQuery.isSuccess && cartQuery.data.items.length === 0 && !success) {
      navigate('/cart', { replace: true })
    }
  }, [isBuyNow, cartQuery.isSuccess, cartQuery.data, success, navigate])

  useEffect(() => {
    const code = promotionCode?.trim() ?? ''
    if (!code) {
      setPromotionFeedback(null)
      setPromotionDiscount(0)
      return
    }
    if (subtotal <= 0) {
      setPromotionFeedback(null)
      setPromotionDiscount(0)
      return
    }

    const timer = setTimeout(() => {
      validatePromotion
        .mutateAsync({ code, subtotal })
        .then((res) => {
          setPromotionDiscount(res.discount_amount)
          setPromotionFeedback(
            `Áp dụng ${res.code}: giảm ${formatVnd(res.discount_amount)}, còn ${formatVnd(res.total_after_discount)}`,
          )
        })
        .catch((error) => {
          setPromotionDiscount(0)
          setPromotionFeedback(getErrorMessage(error))
        })
    }, 550)

    return () => clearTimeout(timer)
  }, [promotionCode, subtotal, validatePromotion])

  async function onSubmit(values: CheckoutFormValues) {
    saveShipping(values)
    let shipping_address
    try {
      shipping_address = await buildShippingAddressFromForm(values)
      setAddressError(null)
    } catch (err) {
      setAddressError(getErrorMessage(err))
      return
    }
    const promotion_code = values.promotion_code?.trim() || undefined
    const body = {
      shipping_address,
      payment_method: values.payment_method,
      ...(values.payment_method === 'offline'
        ? { offline_subtype: values.offline_subtype ?? 'cod' }
        : {}),
      promotion_code,
    }

    try {
      const result =
        isBuyNow && buyNow
          ? await createBuyNow.mutateAsync({
              ...body,
              product_id: buyNow.productId,
              quantity: buyNow.quantity,
            })
          : await createFromCart.mutateAsync(body)

      if (result.vnpay) {
        navigate(`/orders/${result.order.id}/pay`, {
          replace: true,
          state: { vnpay: result.vnpay },
        })
        return
      }
      if (result.bank_instructions) {
        saveBankInstructions(result.bank_instructions)
      }
      setSuccess(result)
      if (isBuyNow) {
        navigate(location.pathname, { replace: true, state: null })
      }
    } catch {
      // shown below
    }
  }

  const submitError = createFromCart.error ?? createBuyNow.error

  if (success) {
    return (
      <PageShell title="Thanh toán" description="Đơn hàng đã được tạo">
        <CheckoutSuccessPanel order={success.order} bankInstructions={success.bank_instructions} />
      </PageShell>
    )
  }

  if (!isBuyNow && cartQuery.isLoading) {
    return (
      <PageShell title="Thanh toán">
        <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />
      </PageShell>
    )
  }

  if (!isBuyNow && cartQuery.isError) {
    return (
      <PageShell title="Thanh toán">
        <div className="rounded-lg border border-danger-700/20 bg-danger-50 p-4 text-sm text-danger-700">
          Không tải được giỏ hàng: {getErrorMessage(cartQuery.error)}
        </div>
      </PageShell>
    )
  }

  const cart = cartQuery.data

  return (
    <PageShell
      title="Thanh toán"
      description={isBuyNow ? 'Mua ngay — không thay đổi giỏ hàng' : 'Đặt hàng từ giỏ hàng'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="font-semibold text-foreground">Địa chỉ giao hàng</h2>
            <div className="mt-4">
              <ShippingAddressFields
                register={register}
                control={control}
                errors={errors}
                setValue={setValue}
                watch={watch}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="font-semibold text-foreground">Thanh toán</h2>
            <fieldset className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-subtle/30">
                <input
                  type="radio"
                  value="offline"
                  className="mt-1"
                  {...register('payment_method')}
                />
                <span>
                  <span className="block text-sm font-medium">Thanh toán offline</span>
                  <span className="text-sm text-foreground-muted">COD hoặc chuyển khoản</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-subtle/30">
                <input
                  type="radio"
                  value="vnpay"
                  className="mt-1"
                  {...register('payment_method')}
                />
                <span>
                  <span className="block text-sm font-medium">VNPay</span>
                  <span className="text-sm text-foreground-muted">
                    Quét mã trên cổng VNPay (hết hạn sau 15 phút)
                  </span>
                </span>
              </label>
            </fieldset>

            {paymentMethod === 'offline' ? (
              <fieldset className="mt-4 space-y-3 border-t border-border pt-4">
                <legend className="mb-2 text-sm text-foreground-muted">Hình thức offline</legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-subtle/30">
                  <input
                    type="radio"
                    value="cod"
                    className="mt-1"
                    {...register('offline_subtype')}
                  />
                  <span>
                    <span className="block text-sm font-medium">Thanh toán khi nhận (COD)</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-subtle/30">
                  <input
                    type="radio"
                    value="bank"
                    className="mt-1"
                    {...register('offline_subtype')}
                  />
                  <span>
                    <span className="block text-sm font-medium">Chuyển khoản ngân hàng</span>
                  </span>
                </label>
                {offlineSubtype === 'bank' ? (
                  <p className="text-sm text-foreground-muted">
                    Sau khi đặt hàng, hệ thống hiển thị số tài khoản và nội dung chuyển khoản.
                  </p>
                ) : null}
              </fieldset>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">
                Bạn sẽ được chuyển sang trang VNPay để quét QR. Đơn chưa thanh toán sẽ tự hủy sau 15 phút.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <label htmlFor="promotion_code" className="block text-sm font-medium text-foreground-muted">
              Mã khuyến mãi (tuỳ chọn)
            </label>
            <input
              id="promotion_code"
              type="text"
              className={`${inputClassName} mt-1`}
              placeholder="Nhập mã nếu có"
              {...register('promotion_code')}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          {!isBuyNow && cart ? (
            <>
              <CartRemovedAlert removedCount={cart.removed_product_ids.length} />
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <h2 className="font-semibold text-foreground">Đơn hàng</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {cart.items.map((item) => (
                    <li key={item.product_id} className="flex justify-between gap-2">
                      <span className="text-foreground-muted">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-medium">{formatVnd(item.line_total)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-border pt-4 text-lg font-semibold text-brand">
                  Tạm tính: {formatVnd(cart.subtotal)}
                </p>
                {promotionDiscount > 0 ? (
                  <>
                    <p className="mt-1 text-sm text-success-700">Giảm mã: -{formatVnd(promotionDiscount)}</p>
                    <p className="mt-1 text-base font-semibold text-brand">
                      Dự kiến còn: {formatVnd(Math.max(0, cart.subtotal - promotionDiscount))}
                    </p>
                  </>
                ) : null}
                <p className="mt-1 text-xs text-foreground-subtle">
                  Giảm giá (nếu có) được áp dụng khi đặt hàng.
                </p>
              </div>
            </>
          ) : buyNow ? (
            <div className="rounded-xl border border-border bg-surface-raised p-5">
              <h2 className="font-semibold text-foreground">Mua ngay</h2>
              <div className="mt-3 flex gap-3">
                {buyNow.displayImageUrl ? (
                  <img
                    src={buyNow.displayImageUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{buyNow.productName}</p>
                  <p className="text-foreground-muted">Số lượng: {buyNow.quantity}</p>
                  <p className="mt-1 font-medium text-brand">{formatVnd(buyNow.lineTotal)}</p>
                </div>
              </div>
            </div>
          ) : null}

          {addressError ? (
            <p className="rounded-lg border border-danger-700/20 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {addressError}
            </p>
          ) : null}

          {submitError ? (
            <p className="rounded-lg border border-danger-700/20 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {getErrorMessage(submitError)}
            </p>
          ) : null}

          {promotionFeedback ? (
            <p
              className={`rounded-lg border px-4 py-3 text-sm ${
                promotionDiscount > 0
                  ? 'border-success-700/20 bg-success-50 text-success-700'
                  : 'border-danger-700/20 bg-danger-50 text-danger-700'
              }`}
            >
              {promotionFeedback}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || (!isBuyNow && !cart?.items.length)}
            className="w-full rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Đang đặt hàng…' : 'Xác nhận đặt hàng'}
          </button>

          <Link
            to={isBuyNow && buyNow ? `/products/${buyNow.productId}` : '/cart'}
            className="block text-center text-sm text-foreground-muted hover:text-brand"
          >
            {isBuyNow ? 'Quay lại sản phẩm' : 'Quay lại giỏ hàng'}
          </Link>
        </aside>
      </form>
    </PageShell>
  )
}
