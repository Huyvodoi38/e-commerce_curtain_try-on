# Rèm AI – Backend (FastAPI + MongoDB)

Backend cho website bán rèm cửa tích hợp AI Try-on.

## Yêu cầu
- Python 3.10+
- MongoDB đang chạy (local hoặc Atlas)
- (Tuỳ chọn) GPU NVIDIA + CUDA cho AI engine

## Cài đặt

### Chế độ 1 – Chỉ chạy backend (CHƯA cần AI) ✅ khuyên dùng để dev nhanh

```powershell
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
# Mở .env và đảm bảo:
#   AI_ENABLED=false

uvicorn main:app --reload
```

→ Backend chạy bình thường, endpoint `POST /ai/tryon` sẽ trả `503` kèm
hướng dẫn bật AI. Không cần cài `torch` / `diffusers` / `segment-anything`.

### Chế độ 2 – Bật AI Try-on

```powershell
# 1. Cài torch theo đúng CUDA của máy: https://pytorch.org/get-started/locally/
# 2. Cài thêm dependencies AI
pip install -r requirements-ai.txt

# 3. Tải model SAM (vit_b ~358MB)
mkdir models
curl -L -o models/sam_vit_b_01ec64.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth

# 4. Bật cờ trong .env
#   AI_ENABLED=true
#   LOAD_AI_ON_STARTUP=false   # để startup nhanh, model load lazy

uvicorn main:app --reload
```

Mặc định API chạy tại http://localhost:8000, docs tại `/docs`.

## Cấu trúc

```
Backend/
  config.py              # đọc .env qua pydantic-settings (có cờ AI_ENABLED)
  database.py            # quản lý kết nối Motor (singleton)
  models.py              # Pydantic models cho User / Product / Order / Try-on
  ai_engine.py           # SAM + Depth + Stable Diffusion (lazy load, chỉ import khi AI bật)
  main.py                # FastAPI app + endpoints
  requirements.txt       # CORE deps (nhẹ)
  requirements-ai.txt    # Deps cho AI (torch, diffusers, segment-anything…)
  .env.example
```

## Endpoints chính

- `GET /` , `GET /health` – health check
- `GET /ai/status` – cho frontend biết AI đang bật/tắt
- `GET /products` , `GET /products/{id}` – liệt kê / chi tiết sản phẩm
- `POST /products` , `PATCH /products/{id}` , `DELETE /products/{id}`
- `POST /orders` , `GET /orders`
- `POST /ai/tryon` – multipart: `image` + `product_id` (hoặc `prompt`) + bbox + tham số
  (trả `503` nếu `AI_ENABLED=false`)
