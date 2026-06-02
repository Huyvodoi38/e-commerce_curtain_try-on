"""Tiện ích dùng chung cho các model."""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Trả về thời điểm hiện tại theo UTC (timezone-aware)."""

    return datetime.now(timezone.utc)
