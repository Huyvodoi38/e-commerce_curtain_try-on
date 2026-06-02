"""Khởi tạo kết nối MongoDB và Beanie ODM."""

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models.activity_log import ActivityLog
from app.models.category import Category
from app.models.cart import Cart
from app.models.history import TryOnHistory
from app.models.oauth_account import UserOAuthAccount
from app.models.order import Order
from app.models.payment_transaction import PaymentTransaction
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.refresh_token import RefreshToken
from app.models.user import User


async def init_db() -> None:
    """Kết nối MongoDB và đăng ký các document models với Beanie."""

    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            User,
            UserOAuthAccount,
            RefreshToken,
            Category,
            Product,
            Cart,
            Order,
            PaymentTransaction,
            TryOnHistory,
            Promotion,
            ActivityLog,
        ],
        allow_index_dropping=settings.BEANIE_ALLOW_INDEX_DROPPING,
    )
    print(f"[OK] Ket noi MongoDB thanh cong — database: {settings.MONGODB_DB_NAME}")
