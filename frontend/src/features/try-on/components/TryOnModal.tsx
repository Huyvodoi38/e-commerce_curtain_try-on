import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMeQuery } from '@/features/auth/hooks'
import { base64ToFile } from '@/features/try-on/api'
import { RoomTryOnCanvas, type BboxRect } from '@/features/try-on/components/RoomTryOnCanvas'
import { usePreviewTryOnMutation, useSaveTryOnMutation } from '@/features/try-on/hooks'
import { getErrorMessage } from '@/lib/api/client'
import { loginPathWithRedirect } from '@/lib/auth/paths'

type Props = {
  productId: string
  productName: string
  open: boolean
  onClose: () => void
}

export function TryOnModal({ productId, productName, open, onClose }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const previewMutation = usePreviewTryOnMutation()
  const saveMutation = useSaveTryOnMutation()

  const [roomFile, setRoomFile] = useState<File | null>(null)
  const [bbox, setBbox] = useState<BboxRect | null>(null)
  const [previewBase64, setPreviewBase64] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isCustomer = meQuery.data?.role === 'customer'
  const isBusy = previewMutation.isPending || saveMutation.isPending

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isBusy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, isBusy, onClose])

  useEffect(() => {
    if (open) return
    setRoomFile(null)
    setBbox(null)
    setPreviewBase64(null)
    setSavedNotice(null)
    setError(null)
  }, [open])

  if (!open) return null

  async function handlePreview() {
    if (!roomFile || !bbox) return
    setError(null)
    setSavedNotice(null)
    try {
      const result = await previewMutation.mutateAsync({
        productId,
        roomImage: roomFile,
        bbox,
      })
      setPreviewBase64(result.result_image_base64)
    } catch (err) {
      setPreviewBase64(null)
      setError(getErrorMessage(err))
    }
  }

  function handleRetry() {
    setPreviewBase64(null)
    setBbox(null)
    setError(null)
    setSavedNotice(null)
  }

  async function handleSave() {
    if (!roomFile || !bbox || !previewBase64) return
    if (!isCustomer) {
      navigate(loginPathWithRedirect(location.pathname))
      return
    }
    setError(null)
    try {
      const resultFile = base64ToFile(previewBase64, 'tryon-result.png')
      await saveMutation.mutateAsync({
        productId,
        roomImage: roomFile,
        resultImage: resultFile,
        bbox,
      })
      setSavedNotice('Đã lưu kết quả vào lịch sử try-on.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const previewUrl = previewBase64 ? `data:image/png;base64,${previewBase64}` : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tryon-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface-raised shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="tryon-modal-title" className="text-lg font-semibold">
              Thử rèm AI
            </h2>
            <p className="mt-0.5 text-sm text-foreground-muted">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-md px-2 py-1 text-sm text-foreground-muted hover:bg-surface-muted disabled:opacity-50"
          >
            Đóng
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <RoomTryOnCanvas
            imageFile={roomFile}
            onImageFileChange={setRoomFile}
            bbox={bbox}
            onBboxChange={(next) => {
              setBbox(next)
              setPreviewBase64(null)
            }}
            disabled={isBusy}
          />

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground-muted">Kết quả preview</p>
            <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
              {previewMutation.isPending ? (
                <p className="text-sm text-foreground-subtle">AI đang xử lý… (~30–90 giây)</p>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Kết quả thử rèm" className="max-h-[min(50vh,360px)] w-full object-contain" />
              ) : (
                <p className="px-4 text-center text-sm text-foreground-subtle">
                  Chọn ảnh, vẽ khung cửa sổ rồi bấm Tạo preview
                </p>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mx-5 rounded-lg border border-danger-700/20 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </p>
        ) : null}

        {savedNotice ? (
          <p className="mx-5 rounded-lg border border-success-700/20 bg-success-50 px-4 py-3 text-sm text-success-700">
            {savedNotice}{' '}
            <Link to="/account/try-on" className="font-medium underline hover:no-underline" onClick={onClose}>
              Xem lịch sử
            </Link>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          {!previewBase64 ? (
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={!roomFile || !bbox || previewMutation.isPending}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
            >
              {previewMutation.isPending ? 'Đang tạo…' : 'Tạo preview'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isBusy}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-muted disabled:opacity-50"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isBusy || !!savedNotice}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Đang lưu…' : 'Lưu kết quả'}
              </button>
              {!isCustomer && meQuery.isSuccess ? (
                <p className="w-full text-xs text-foreground-subtle">
                  Cần đăng nhập tài khoản khách hàng để lưu lịch sử.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
