"""Router kiểm tra sức khỏe hệ thống."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
async def root() -> dict[str, str]:
    """Endpoint gốc — kiểm tra backend và DB đã sẵn sàng."""

    return {
        "status": "success",
        "message": "Hệ thống Backend FastAPI và Database MongoDB đã kết nối thành công!",
    }
