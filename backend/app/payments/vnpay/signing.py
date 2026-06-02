"""Ký và xác thực tham số VNPay (HMAC-SHA512)."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any
from urllib.parse import quote_plus


def _quote_vnp_value(value: str) -> str:
    """Encode giá trị theo quy ước VNPay (tương đương qs encode: false)."""

    return quote_plus(str(value), safe="")


def build_sign_data(params: dict[str, Any]) -> str:
    """Chuỗi ký: key=value nối &, key sort alphabet, bỏ hash fields."""

    filtered: list[tuple[str, str]] = []
    for key, value in params.items():
        if key in ("vnp_SecureHash", "vnp_SecureHashType"):
            continue
        if value is None or value == "":
            continue
        filtered.append((key, str(value)))
    filtered.sort(key=lambda item: item[0])
    return "&".join(f"{k}={v}" for k, v in filtered)


def secure_hash(secret: str, sign_data: str) -> str:
    return hmac.new(secret.encode("utf-8"), sign_data.encode("utf-8"), hashlib.sha512).hexdigest()


def sign_params(params: dict[str, Any], secret: str) -> str:
    return secure_hash(secret, build_sign_data(params))


def verify_secure_hash(params: dict[str, Any], secret: str) -> bool:
    received = params.get("vnp_SecureHash")
    if not received or not isinstance(received, str):
        return False
    expected = sign_params(params, secret)
    return hmac.compare_digest(expected.lower(), received.lower())


def build_payment_query_string(params: dict[str, Any], secret: str) -> str:
    """Query string đầy đủ kèm vnp_SecureHash (dùng cho redirect URL)."""

    signed = dict(params)
    signed["vnp_SecureHash"] = sign_params(signed, secret)
    pairs: list[tuple[str, str]] = []
    for key, value in sorted(signed.items(), key=lambda x: x[0]):
        if value is None or value == "":
            continue
        pairs.append((key, str(value)))
    return "&".join(f"{k}={_quote_vnp_value(v)}" for k, v in pairs)
