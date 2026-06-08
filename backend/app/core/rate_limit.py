"""Rate limiting đơn giản in-memory (sliding window).

Đủ cho deploy 1 instance (vd. Render free). Khi scale nhiều instance cần
chuyển sang backend chia sẻ (Redis) vì bộ đếm này không dùng chung giữa
các process.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from app.core.config import settings


class _SlidingWindowLimiter:
    """Đếm số request trong cửa sổ trượt theo từng key."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, *, limit: int, window_seconds: float) -> tuple[bool, float]:
        """Trả về (cho_phép, retry_after_giây)."""

        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = window_seconds - (now - bucket[0])
                return False, max(retry_after, 0.0)
            bucket.append(now)
            # Dọn các key rỗng để tránh phình bộ nhớ theo thời gian
            if not bucket:
                self._hits.pop(key, None)
            return True, 0.0


_limiter = _SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    """IP client — ưu tiên X-Forwarded-For (sau reverse proxy)."""

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit(*, limit: int, window_seconds: float, scope: str):
    """Tạo dependency giới hạn tần suất theo IP cho một nhóm endpoint.

    Args:
        limit: số request tối đa trong cửa sổ.
        window_seconds: độ dài cửa sổ (giây).
        scope: tiền tố tách biệt nhóm endpoint (vd. "ai", "auth").
    """

    async def dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        key = f"{scope}:{client_ip(request)}"
        allowed, retry_after = _limiter.check(
            key, limit=limit, window_seconds=window_seconds
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút",
                headers={"Retry-After": str(int(retry_after) + 1)},
            )

    return dependency
