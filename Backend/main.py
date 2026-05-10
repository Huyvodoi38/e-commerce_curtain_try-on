"""Điểm khởi chạy chính của FastAPI cho website bán rèm + AI Try-on."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from io import BytesIO
from typing import List, Optional

from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from PIL import Image

from config import get_settings
from database import close_mongo_connection, connect_to_mongo, get_database
from models import (
    OrderCreate,
    OrderInDB,
    ProductCreate,
    ProductInDB,
    ProductUpdate,
)

# LƯU Ý: KHÔNG import `ai_engine` ở module level.
# Module này phụ thuộc torch/diffusers/segment-anything (rất nặng).
# Chỉ import bên trong endpoint khi `settings.ai_enabled = True`.

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()


# ---------------------------------------------------------------------------
# Lifespan: kết nối DB + (tuỳ chọn) preload AI khi server start
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Quản lý vòng đời ứng dụng: khởi tạo & dọn dẹp tài nguyên."""
    await connect_to_mongo()

    # Chỉ preload AI khi cả 2 cờ cùng bật. Import lazy để khi tắt AI
    # backend không cần cài torch/diffusers.
    if settings.ai_enabled and settings.load_ai_on_startup:
        logger.info("Preload AI engine khi server start ...")
        from ai_engine import get_ai_engine

        engine = get_ai_engine()
        engine.load_models()
    elif not settings.ai_enabled:
        logger.info("AI_ENABLED=false → bỏ qua khởi tạo AI engine.")

    yield

    await close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    description="Backend cho website bán rèm cửa tích hợp AI Try-on.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def root() -> dict:
    return {"app": settings.app_name, "status": "ok"}


@app.get("/health", tags=["Health"])
async def health(db: AsyncIOMotorDatabase = Depends(get_database)) -> dict:
    """Kiểm tra nhanh kết nối DB."""
    await db.command("ping")
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Helper convert document
# ---------------------------------------------------------------------------
def _serialize(doc: dict) -> dict:
    """Chuyển ObjectId trong document sang str để trả về JSON."""
    if doc is None:
        return doc
    doc = dict(doc)
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc


# ---------------------------------------------------------------------------
# CRUD sản phẩm rèm
# ---------------------------------------------------------------------------
@app.get("/products", tags=["Products"])
async def list_products(
    skip: int = 0,
    limit: int = 20,
    category_slug: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> List[dict]:
    """Liệt kê sản phẩm với phân trang đơn giản."""
    query: dict = {}
    if category_slug:
        query["category_slug"] = category_slug

    cursor = db.products.find(query).skip(skip).limit(limit)
    items = [_serialize(doc) async for doc in cursor]
    return items


@app.get("/products/{product_id}", tags=["Products"])
async def get_product(product_id: str, db: AsyncIOMotorDatabase = Depends(get_database)) -> dict:
    """Lấy chi tiết 1 sản phẩm theo ID."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="product_id không hợp lệ")

    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return _serialize(doc)


@app.post("/products", tags=["Products"], status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Tạo mới một sản phẩm rèm."""
    product = ProductInDB(**payload.model_dump())
    doc = product.model_dump(by_alias=True, exclude_none=True)
    doc.pop("_id", None)

    result = await db.products.insert_one(doc)
    created = await db.products.find_one({"_id": result.inserted_id})
    return _serialize(created)


@app.patch("/products/{product_id}", tags=["Products"])
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Cập nhật một phần thông tin sản phẩm."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="product_id không hợp lệ")

    update_data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")

    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    return _serialize(doc)


@app.delete("/products/{product_id}", tags=["Products"])
async def delete_product(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="product_id không hợp lệ")

    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Đơn hàng
# ---------------------------------------------------------------------------
@app.post("/orders", tags=["Orders"], status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Tạo đơn hàng. Tổng tiền tính từ items."""
    total = sum(item.quantity * item.unit_price for item in payload.items)
    order = OrderInDB(**payload.model_dump(), total=total)
    doc = order.model_dump(by_alias=True, exclude_none=True)
    doc.pop("_id", None)

    result = await db.orders.insert_one(doc)
    created = await db.orders.find_one({"_id": result.inserted_id})
    return _serialize(created)


@app.get("/orders", tags=["Orders"])
async def list_orders(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> List[dict]:
    cursor = db.orders.find({}).sort("created_at", -1).skip(skip).limit(limit)
    return [_serialize(doc) async for doc in cursor]


# ---------------------------------------------------------------------------
# AI Try-on
# ---------------------------------------------------------------------------
@app.get("/ai/status", tags=["AI"])
async def ai_status() -> dict:
    """Cho frontend biết tính năng AI có đang bật hay không."""
    return {"enabled": settings.ai_enabled}


@app.post("/ai/tryon", tags=["AI"])
async def tryon_curtain(
    image: UploadFile = File(..., description="Ảnh chụp cửa sổ của khách hàng"),
    product_id: Optional[str] = Form(default=None),
    prompt: Optional[str] = Form(default=None),
    negative_prompt: Optional[str] = Form(default=None),
    x_min: int = Form(default=0),
    y_min: int = Form(default=0),
    x_max: int = Form(default=0),
    y_max: int = Form(default=0),
    expansion: int = Form(default=50),
    control_scale: float = Form(default=0.35),
    process_res: int = Form(default=768),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> StreamingResponse:
    """Sinh ảnh thử rèm dựa trên ảnh đầu vào của khách + mẫu rèm chọn."""

    # Khi tắt AI, trả về 503 ngay từ đầu để không phải import torch/diffusers.
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Tính năng AI Try-on đang tắt. "
                "Đặt AI_ENABLED=true trong .env và cài requirements-ai.txt để bật."
            ),
        )

    # Import & khởi tạo engine LAZY: chỉ chạm tới torch khi thực sự cần.
    try:
        from ai_engine import get_ai_engine
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Chưa cài đầy đủ dependencies AI. "
                "Chạy: pip install -r requirements-ai.txt"
            ),
        ) from exc

    engine = get_ai_engine()

    # Ưu tiên prompt theo sản phẩm nếu có product_id
    final_prompt = prompt
    final_neg = negative_prompt

    if product_id:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="product_id không hợp lệ")
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        final_prompt = final_prompt or product.get("ai_prompt") or ""
        final_neg = final_neg or product.get("ai_negative_prompt") or ""

    if not final_prompt:
        raise HTTPException(status_code=400, detail="Cần truyền prompt hoặc product_id hợp lệ.")

    img_bytes = await image.read()
    try:
        img_pil = Image.open(BytesIO(img_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Không đọc được ảnh: {exc}") from exc

    bbox = None
    if x_max > x_min and y_max > y_min:
        bbox = (x_min, y_min, x_max, y_max)

    try:
        result_pil = engine.run_tryon(
            image=img_pil,
            prompt=final_prompt,
            negative_prompt=final_neg or "",
            bbox=bbox,
            expansion=expansion,
            control_scale=control_scale,
            process_res=process_res,
        )
    except Exception as exc:
        logger.exception("AI try-on lỗi")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    buf = BytesIO()
    result_pil.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


# ---------------------------------------------------------------------------
# Chạy trực tiếp bằng `python main.py` khi develop
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
