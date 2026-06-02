# Curtain AI TryOn — Frontend

React + TypeScript + Vite + Tailwind CSS v4.

## Yêu cầu

- Node.js 20+
- Backend chạy tại `http://127.0.0.1:8000` (`uvicorn app.main:app --reload` trong thư mục `backend`)

## Cài đặt

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Mở **http://localhost:5173** (phải trùng `FRONTEND_URL` trong `backend/.env`).

## Cấu trúc

- `src/app/` — router, layout, providers
- `src/features/` — module theo nghiệp vụ (auth, products, cart, orders, admin…)
- `src/lib/` — api client, auth, permissions, utils
- `FE_SPEC.md` — spec triển khai chi tiết (gồm Google OAuth §3.2)

## Dev proxy (`vite.config.ts`)

Khi `VITE_API_URL` **để trống**, Vite proxy các route API tới `http://127.0.0.1:8000`:

| Proxy | Ghi chú |
|-------|---------|
| `/auth/google/*`, `/auth/me`, `/auth/login`, … | → Backend |
| `/auth/callback` | → **SPA** (`index.html`) — route React, không phải API |
| `/products`, `/cart`, `/orders`, … | → Backend |

## Đăng nhập Google (dev)

1. `backend/.env`: `FRONTEND_URL=http://localhost:5173`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
2. `frontend/.env`: `VITE_API_URL=` (trống).
3. [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth client (Web):
   - **Authorized redirect URIs:** `http://localhost:5173/auth/google/callback`
   - **Authorized JavaScript origins:** `http://localhost:5173`
4. Chỉ dùng **localhost** (không trộn `127.0.0.1`) khi mở app.
5. Login/Register → **Đăng nhập bằng Google**.

Log uvicorn `302` trên `/auth/google/login` và `/auth/google/callback` là **bình thường** (redirect OAuth).

Chi tiết: `FE_SPEC.md` §3.2, `backend/BE_SPEC_PROGRESS.md` §5.1.1.

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server (`localhost:5173`) |
| `npm run build` | Build production |
| `npm run preview` | Xem bản build |

## Production

Copy `frontend/.env.production.example` → `.env.production`, set `VITE_API_URL=https://api.example.com`, rồi `npm run build`. Xem `backend/.env.production.example` cho cookie cross-site (`SameSite=None`).
