"""Điểm vào chính của ứng dụng FastAPI."""

import asyncio
import contextlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routers import api_router
from app.core.config import settings
from app.database.db import init_db


async def _vnpay_expiry_worker(stop: asyncio.Event) -> None:
    """Định kỳ hủy đơn VNPay quá hạn thanh toán."""

    from app.services import vnpay_service

    while not stop.is_set():
        try:
            await vnpay_service.expire_unpaid_vnpay_orders()
        except Exception as exc:
            print(f"[WARN] vnpay expiry worker: {exc}")
        try:
            await asyncio.wait_for(stop.wait(), timeout=60.0)
        except asyncio.TimeoutError:
            continue


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Khởi tạo MongoDB/Beanie khi startup."""

    await init_db()
    stop = asyncio.Event()
    worker = asyncio.create_task(_vnpay_expiry_worker(stop))
    try:
        yield
    finally:
        stop.set()
        worker.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await worker


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Session cần cho OAuth state (authlib)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# withCredentials (refresh cookie) không tương thích Access-Control-Allow-Origin: *
_dev_origins = {
    settings.FRONTEND_URL.rstrip("/"),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}
_cors_origins = list(_dev_origins) if settings.CORS_ALLOW_ALL else [settings.FRONTEND_URL.rstrip("/")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
