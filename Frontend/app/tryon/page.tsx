"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { fetchProduct, runTryOn, type Product } from "@/lib/api";

export default function TryOnPage() {
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId") ?? "";

  const [product, setProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [expansion, setExpansion] = useState<number>(50);
  const [controlScale, setControlScale] = useState<number>(0.35);
  const [processRes, setProcessRes] = useState<number>(768);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lấy thông tin sản phẩm nếu URL có productId
  useEffect(() => {
    if (!productIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchProduct(productIdParam);
        if (cancelled) return;
        setProduct(p);
        setPrompt(p.ai_prompt ?? "");
        setNegativePrompt(p.ai_negative_prompt ?? "");
      } catch (err) {
        if (!cancelled) setProductError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productIdParam]);

  // Tạo URL preview cho ảnh đầu vào
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const isFormValid = useMemo(() => {
    return Boolean(imageFile && (prompt.trim() || product));
  }, [imageFile, prompt, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultUrl(null);

    try {
      const blob = await runTryOn({
        image: imageFile,
        productId: product?._id,
        prompt: prompt || undefined,
        negativePrompt: negativePrompt || undefined,
        expansion,
        controlScale,
        processRes,
      });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-brand-800">AI Try-on</h1>
      <p className="mt-2 text-brand-700/80">
        Tải ảnh phòng của bạn lên, chọn (hoặc tự nhập) mô tả mẫu rèm và để AI
        sinh kết quả.
      </p>

      {product && (
        <div className="mt-6 rounded-xl border border-brand-200/60 bg-brand-50 p-4 text-sm text-brand-800">
          Đang thử sản phẩm: <strong>{product.name}</strong>
        </div>
      )}
      {productError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Lỗi tải sản phẩm: {productError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-8 lg:grid-cols-[1fr,1fr]"
      >
        {/* Cột 1: Input */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-brand-800">
              1. Ảnh phòng của bạn
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
            />
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="mt-4 max-h-80 w-full rounded-xl border border-brand-200/60 object-contain"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-800">
              2. Mô tả mẫu rèm (prompt)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Vd: A pair of white solid curtains, cotton, blackout..."
              className="mt-2 w-full rounded-xl border border-brand-200/60 bg-white/80 p-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-800">
              Negative prompt
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-xl border border-brand-200/60 bg-white/80 p-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <details className="rounded-xl border border-brand-200/60 bg-white/60 p-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-800">
              Nâng cao
            </summary>
            <div className="mt-4 space-y-4 text-sm text-brand-800">
              <RangeField
                label={`Mở rộng mask: ${expansion}px`}
                min={0}
                max={150}
                step={5}
                value={expansion}
                onChange={setExpansion}
              />
              <RangeField
                label={`Control scale: ${controlScale.toFixed(2)}`}
                min={0.1}
                max={1}
                step={0.05}
                value={controlScale}
                onChange={setControlScale}
              />
              <RangeField
                label={`Độ phân giải xử lý: ${processRes}px`}
                min={512}
                max={1024}
                step={128}
                value={processRes}
                onChange={setProcessRes}
              />
            </div>
          </details>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "AI đang xử lý..." : "Tạo ảnh rèm"}
          </button>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Cột 2: Kết quả */}
        <div className="rounded-2xl border border-brand-200/60 bg-white/60 p-4">
          <h2 className="text-lg font-semibold text-brand-800">Kết quả</h2>
          <div className="mt-4 flex h-[480px] items-center justify-center rounded-xl border border-dashed border-brand-300 bg-brand-50">
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resultUrl}
                alt="Kết quả AI"
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : (
              <p className="text-sm text-brand-700/60">
                {isSubmitting
                  ? "Đang gọi AI, vui lòng chờ..."
                  : "Ảnh kết quả sẽ hiển thị ở đây."}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

interface RangeFieldProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

function RangeField({ label, min, max, step, value, onChange }: RangeFieldProps) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand-600"
      />
    </label>
  );
}
