"""Đăng ký tập hợp API routers."""

from fastapi import APIRouter

from app.api.routers import (
    admin,
    audit_logs,
    auth,
    cart,
    categories,
    health,
    media,
    orders,
    payments,
    products,
    promotions,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(admin.router)
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(media.router)
api_router.include_router(promotions.router)
api_router.include_router(cart.router)
api_router.include_router(payments.router)
api_router.include_router(orders.router)
api_router.include_router(users.router)
api_router.include_router(audit_logs.router)

__all__ = ["api_router"]
