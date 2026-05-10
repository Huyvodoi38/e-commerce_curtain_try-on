export const metadata = {
  title: "Giới thiệu | Rèm AI",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-brand-800">Về Rèm AI</h1>
      <p className="mt-4 text-brand-700/80 leading-relaxed">
        Rèm AI là dự án thử nghiệm kết hợp giữa thương mại điện tử và AI tạo
        sinh. Khách hàng có thể tải ảnh không gian thật, chọn mẫu rèm và xem
        trước kết quả ngay trong vài giây nhờ pipeline SAM + Stable Diffusion +
        ControlNet Depth.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-brand-800">Công nghệ</h2>
      <ul className="mt-3 list-disc pl-6 text-brand-700/80">
        <li>Frontend: Next.js (App Router), TypeScript, Tailwind CSS.</li>
        <li>Backend: FastAPI, Motor (MongoDB), Pydantic v2.</li>
        <li>AI: Segment Anything (vit_b), DPT Depth, Stable Diffusion 1.5 + ControlNet Depth Inpainting.</li>
      </ul>
    </div>
  );
}
