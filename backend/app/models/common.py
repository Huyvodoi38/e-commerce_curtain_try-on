"""Tiện ích dùng chung cho các model."""

from datetime import datetime, timedelta, timezone

# Giờ Việt Nam (UTC+7, không DST) — dùng khi không cần tzdata trên Windows.
VN_TZ = timezone(timedelta(hours=7))


def utc_now() -> datetime:
    """Trả về thời điểm hiện tại theo UTC (timezone-aware)."""

    return datetime.now(timezone.utc)
