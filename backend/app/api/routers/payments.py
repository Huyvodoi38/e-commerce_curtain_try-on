"""Callback VNPay — IPN (public) và health."""

from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.services import vnpay_service

router = APIRouter(prefix="/payments/vnpay", tags=["payments"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.get("/ipn")
async def vnpay_ipn(request: Request) -> JSONResponse:
    """IPN VNPay — không cần auth; URL public (ngrok khi dev)."""

    query: dict[str, Any] = dict(request.query_params)
    result = await vnpay_service.handle_ipn(query)
    return JSONResponse(content=result)
