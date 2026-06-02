"""Sanitize post-login redirect paths (OAuth state, FE deep links)."""


def sanitize_redirect_path(value: str | None) -> str | None:
    """Chỉ cho phép path nội bộ tương đối an toàn."""

    if not value or not value.strip():
        return None
    path = value.strip()
    if not path.startswith("/") or path.startswith("//"):
        return None
    lowered = path.lower()
    if lowered.startswith("/login") or lowered.startswith("/register") or lowered.startswith("/auth/"):
        return None
    return path
