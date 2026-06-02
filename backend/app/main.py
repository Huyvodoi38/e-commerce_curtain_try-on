"""Điểm vào chính của ứng dụng FastAPI."""

import asyncio
import contextlib
import logging
from contextvars import ContextVar
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.sessions import SessionMiddleware

from app.api.routers import api_router
from app.core.config import settings
from app.database.db import init_db

settings.validate_runtime_safety()

_request_id: ContextVar[str] = ContextVar("request_id", default="-")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [request_id=%(request_id)s] %(name)s: %(message)s",
)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


for _handler in logging.getLogger().handlers:
    _handler.addFilter(RequestIdFilter())

logger = logging.getLogger(__name__)


async def _vnpay_expiry_worker(stop: asyncio.Event) -> None:
    """Định kỳ hủy đơn VNPay quá hạn thanh toán."""

    from app.services import vnpay_service

    while not stop.is_set():
        try:
            await vnpay_service.expire_unpaid_vnpay_orders()
        except Exception as exc:
            logger.warning("vnpay expiry worker failed: %s", exc)
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


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id", "") or str(id(request))
    token = _request_id.set(request_id)
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
    finally:
        _request_id.reset(token)


def _error_payload(request: Request, *, code: str, message: str, detail=None) -> dict:
    request_id = getattr(request.state, "request_id", "-")
    payload = {
        "detail": message,
        "error": {"code": code, "message": message, "request_id": request_id},
    }
    if detail is not None:
        payload["error"]["detail"] = detail
    return payload


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(
            request, code="http_error", message=str(exc.detail), detail=exc.detail
        ),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=_error_payload(
            request,
            code="validation_error",
            message="Dữ liệu không hợp lệ",
            detail=jsonable_encoder(exc.errors()),
        ),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content=_error_payload(request, code="internal_error", message="Lỗi hệ thống"),
    )
