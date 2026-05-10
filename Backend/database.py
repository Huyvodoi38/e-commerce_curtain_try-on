"""Khởi tạo và quản lý kết nối MongoDB bằng Motor (async).

Chiến lược kết nối:
- Mỗi ứng dụng FastAPI duy trì duy nhất MỘT AsyncIOMotorClient (singleton),
  vì client của Motor đã quản lý connection pool nội bộ.
- Khởi tạo client tại sự kiện startup, đóng client tại sự kiện shutdown.
- Dependency `get_database` trả về Database để tái sử dụng trong các route.
"""
from __future__ import annotations

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import get_settings

logger = logging.getLogger(__name__)


class MongoManager:
    """Quản lý vòng đời kết nối MongoDB cho toàn ứng dụng."""

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


mongo_manager = MongoManager()


async def connect_to_mongo() -> None:
    """Mở kết nối MongoDB khi server khởi động."""
    settings = get_settings()
    logger.info("Đang kết nối MongoDB tại %s ...", settings.mongo_uri)

    mongo_manager.client = AsyncIOMotorClient(
        settings.mongo_uri,
        # Giới hạn pool để tránh chiếm dụng quá nhiều tài nguyên
        maxPoolSize=50,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
    )
    mongo_manager.db = mongo_manager.client[settings.mongo_db_name]

    # Ping nhanh để đảm bảo kết nối thành công
    await mongo_manager.client.admin.command("ping")
    logger.info("Kết nối MongoDB thành công, database = %s", settings.mongo_db_name)


async def close_mongo_connection() -> None:
    """Đóng kết nối khi server shutdown."""
    if mongo_manager.client is not None:
        mongo_manager.client.close()
        mongo_manager.client = None
        mongo_manager.db = None
        logger.info("Đã đóng kết nối MongoDB.")


def get_database() -> AsyncIOMotorDatabase:
    """Dependency của FastAPI: trả về handle database hiện tại."""
    if mongo_manager.db is None:
        raise RuntimeError(
            "MongoDB chưa được khởi tạo. Hãy chắc chắn `connect_to_mongo` đã được gọi."
        )
    return mongo_manager.db
