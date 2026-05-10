# Rèm AI – Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS.

## Yêu cầu
- Node.js >= 18.18

## Cài đặt
```bash
npm install
cp .env.local.example .env.local   # chỉnh NEXT_PUBLIC_API_URL nếu cần
npm run dev
```

App chạy tại http://localhost:3000.

## Cấu trúc thư mục
```
app/
  layout.tsx         # Root layout (Navbar + Footer)
  page.tsx           # Trang chủ
  products/page.tsx  # Bộ sưu tập rèm (Server Component, gọi /products)
  tryon/page.tsx     # AI Try-on (Client Component, gọi /ai/tryon)
  about/page.tsx     # Giới thiệu
components/
  Navbar.tsx
  Footer.tsx
lib/
  api.ts             # Wrapper gọi backend FastAPI
```
