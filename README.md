# Curtain AI TryOn

Fullstack monorepo gồm:

- `frontend`: React + TypeScript + Vite
- `backend`: FastAPI + MongoDB (Beanie)

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`, backend tại `http://127.0.0.1:8000`.

## Quality gates

- Backend: `pytest -q`
- Frontend: `npm run lint` và `npm run build`
- CI workflow: `.github/workflows/ci.yml`

## Production env safety

Backend có fail-fast checks cho cấu hình production-like:

- `CORS_ALLOW_ALL=false`
- `COOKIE_SECURE=true`
- Cross-domain cookie phải `COOKIE_SAMESITE=none`
- `GOOGLE_REDIRECT_URI` và `VNPAY_IPN_URL` không dùng localhost trên production

Xem mẫu biến môi trường:

- `backend/.env.production.example`
- `frontend/.env.production.example`
