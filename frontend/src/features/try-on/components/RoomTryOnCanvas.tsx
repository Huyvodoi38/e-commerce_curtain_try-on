import { useCallback, useEffect, useRef, useState } from 'react'

export type BboxRect = {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

type DragState = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type Props = {
  imageFile: File | null
  onImageFileChange: (file: File | null) => void
  bbox: BboxRect | null
  onBboxChange: (bbox: BboxRect | null) => void
  disabled?: boolean
}

export function RoomTryOnCanvas({
  imageFile,
  onImageFileChange,
  bbox,
  onBboxChange,
  disabled,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [drag, setDrag] = useState<DragState | null>(null)

  useEffect(() => {
    if (!imageFile) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const measureDisplaySize = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setDisplaySize({ width: rect.width, height: rect.height })
    }
  }, [])

  useEffect(() => {
    measureDisplaySize()
    window.addEventListener('resize', measureDisplaySize)
    return () => window.removeEventListener('resize', measureDisplaySize)
  }, [objectUrl, naturalSize, measureDisplaySize])

  useEffect(() => {
    const img = imgRef.current
    if (!img || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measureDisplaySize())
    observer.observe(img)
    return () => observer.disconnect()
  }, [objectUrl, measureDisplaySize])

  const scaleX = naturalSize.width && displaySize.width ? naturalSize.width / displaySize.width : 1
  const scaleY = naturalSize.height && displaySize.height ? naturalSize.height / displaySize.height : 1

  function pointerPos(event: React.PointerEvent) {
    const img = imgRef.current
    if (!img) return { x: 0, y: 0 }
    const rect = img.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || !imageFile) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const pos = pointerPos(event)
    setDrag({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    event.preventDefault()
    const pos = pointerPos(event)
    setDrag((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : prev))
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const xMinD = Math.min(drag.startX, drag.currentX)
    const yMinD = Math.min(drag.startY, drag.currentY)
    const xMaxD = Math.max(drag.startX, drag.currentX)
    const yMaxD = Math.max(drag.startY, drag.currentY)
    setDrag(null)

    if (xMaxD - xMinD < 8 || yMaxD - yMinD < 8) {
      onBboxChange(null)
      return
    }

    onBboxChange({
      x_min: Math.round(xMinD * scaleX),
      y_min: Math.round(yMinD * scaleY),
      x_max: Math.round(xMaxD * scaleX),
      y_max: Math.round(yMaxD * scaleY),
    })
  }

  const overlayRect = drag
    ? {
        left: Math.min(drag.startX, drag.currentX),
        top: Math.min(drag.startY, drag.currentY),
        width: Math.abs(drag.currentX - drag.startX),
        height: Math.abs(drag.currentY - drag.startY),
      }
    : bbox && displaySize.width
      ? {
          left: bbox.x_min / scaleX,
          top: bbox.y_min / scaleY,
          width: (bbox.x_max - bbox.x_min) / scaleX,
          height: (bbox.y_max - bbox.y_min) / scaleY,
        }
      : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground-muted">Kéo chuột / ngón tay vẽ khung quanh cửa sổ</p>
        <label className="cursor-pointer text-xs font-medium text-brand hover:underline">
          {imageFile ? 'Đổi ảnh' : 'Chọn ảnh'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              e.target.value = ''
              onImageFileChange(file)
              onBboxChange(null)
            }}
          />
        </label>
      </div>

      {!imageFile ? (
        <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted px-4 py-8 text-center">
          <span className="text-sm font-medium">Tải ảnh phòng lên</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              e.target.value = ''
              onImageFileChange(file)
            }}
          />
        </label>
      ) : (
        <div className="flex justify-center rounded-xl border border-border bg-surface-muted p-2">
          <div
            ref={stageRef}
            className={`relative inline-block max-w-full select-none ${
              disabled ? 'pointer-events-none opacity-60' : 'cursor-crosshair touch-none'
            }`}
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            {objectUrl ? (
              <img
                ref={imgRef}
                src={objectUrl}
                alt="Ảnh phòng"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className="pointer-events-none block max-h-[min(50vh,360px)] max-w-full select-none"
                onLoad={(event) => {
                  const img = event.currentTarget
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
                  measureDisplaySize()
                }}
              />
            ) : null}
            {overlayRect ? (
              <div
                className="pointer-events-none absolute border-2 border-brand bg-brand/10"
                style={{
                  left: overlayRect.left,
                  top: overlayRect.top,
                  width: overlayRect.width,
                  height: overlayRect.height,
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
