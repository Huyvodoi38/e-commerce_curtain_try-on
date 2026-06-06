"""Chuyển thuộc tính sản phẩm (tiếng Việt) sang prompt tiếng Anh cho Stable Diffusion."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field
from typing import Any

from app.ai.config import (
    DEFAULT_HEADER_EN,
    DEFAULT_TEXTURE_EN,
    NEGATIVE_PROMPT,
    PROMPT_TAIL,
    REQUIRED_SLOTS,
    SLOT_LABELS_VI,
)

SLOT_KEY_ALIASES: dict[str, tuple[str, ...]] = {
    "color": ("mau sac", "mau", "color"),
    "material": ("chat lieu", "vai", "material", "chat lieu vai"),
    "pattern": ("kieu hoa van", "hoa van", "pattern", "kieu dang"),
    "opacity": ("do che sang", "che sang", "opacity"),
    "texture": ("kieu nep", "texture", "kieu gap"),
    "header": ("kieu treo", "chieu dai", "header", "do dai"),
}

VALUE_MAP: dict[str, dict[str, str]] = {
    "color": {
        "trang": "white",
        "white": "white",
        "be": "beige",
        "beige": "beige",
        "kem": "cream",
        "cream": "cream",
        "xam": "grey",
        "grey": "grey",
        "gray": "grey",
        "xam dam": "charcoal",
        "charcoal": "charcoal",
        "navy": "navy blue",
        "xanh navy": "navy blue",
        "xanh la nhat": "sage green",
        "sage green": "sage green",
        "den": "dark grey",
        "den dam": "dark grey",
    },
    "material": {
        "cotton": "cotton",
        "vai cotton": "cotton",
        "linen": "linen",
        "lanh": "linen",
        "vai linen": "linen",
        "polyester": "polyester",
        "voan": "sheer voile",
        "sheer voile": "sheer voile",
        "velvet": "velvet",
        "nhung": "velvet",
        "tre truc": "bamboo blend",
        "bamboo blend": "bamboo blend",
        "to on": "polyester blackout blend",
    },
    "pattern": {
        "tron": "solid",
        "solid": "solid",
        "trơn": "solid",
        "soc": "striped",
        "striped": "striped",
        "sọc": "striped",
        "hoa": "floral",
        "floral": "floral",
        "geometric": "geometric",
        "hoa tiet": "geometric",
        "det kim": "textured weave",
        "textured weave": "textured weave",
    },
    "opacity": {
        "mong": "sheer light-filtering",
        "sheer light-filtering": "sheer light-filtering",
        "loc sang": "sheer light-filtering",
        "cản sáng vừa": "semi-blackout",
        "can sang vua": "semi-blackout",
        "semi-blackout": "semi-blackout",
        "chan sang": "blackout",
        "chắn sáng": "blackout",
        "blackout": "blackout",
        "to on": "blackout",
    },
    "texture": {
        "mem tu nhien": "soft natural folds",
        "soft natural folds": "soft natural folds",
        "gap ly": "crisp pleated",
        "crisp pleated": "crisp pleated",
        "roi tu nhien": "flowing drape",
        "flowing drape": "flowing drape",
        "day sang trong": "heavy luxurious",
        "heavy luxurious": "heavy luxurious",
    },
    "header": {
        "sat tran": "ceiling to floor",
        "ceiling to floor": "ceiling to floor",
        "sát trần": "ceiling to floor",
        "ngang cua so": "sill length",
        "sill length": "sill length",
        "keo dai xuong san": "pooled on floor",
        "pooled on floor": "pooled on floor",
    },
}


def normalize_text(value: str) -> str:
    """Lowercase, bỏ dấu, gom khoảng trắng."""

    cleaned = value.strip().lower().replace("đ", "d")
    normalized = unicodedata.normalize("NFD", cleaned)
    without_marks = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return " ".join(without_marks.split())


def _slot_for_key(key: str) -> str | None:
    norm = normalize_text(key)
    for slot, aliases in SLOT_KEY_ALIASES.items():
        if norm in aliases:
            return slot
    return None


def _map_value(slot: str, raw_value: str) -> str | None:
    norm = normalize_text(raw_value)
    if not norm:
        return None
    slot_map = VALUE_MAP.get(slot, {})
    if norm in slot_map:
        return slot_map[norm]
    # Thử khớp từng cụm trong map (value dài hơn)
    for key, en in slot_map.items():
        if key in norm or norm in key:
            return en
    return None


def _flatten_attributes(attributes: Any) -> dict[str, str]:
    if not isinstance(attributes, dict):
        return {}
    result: dict[str, str] = {}
    for key, value in attributes.items():
        if not isinstance(key, str):
            continue
        if value is None:
            continue
        text = str(value).strip()
        if text:
            result[key.strip()] = text
    return result


def build_prompt_from_slots(slots_en: dict[str, str]) -> str:
    texture = slots_en.get("texture", DEFAULT_TEXTURE_EN)
    header = slots_en.get("header", DEFAULT_HEADER_EN)
    return (
        f"A pair of {slots_en['color']} {slots_en['pattern']} curtains, "
        f"{slots_en['material']}, {slots_en['opacity']}, "
        f"{texture}, {header}, {PROMPT_TAIL}"
    )


@dataclass
class AiPromptResolveResult:
    available: bool
    prompt: str | None = None
    negative_prompt: str = NEGATIVE_PROMPT
    missing_slots: list[str] = field(default_factory=list)
    unmapped: list[str] = field(default_factory=list)
    slots_en: dict[str, str] = field(default_factory=dict)


def resolve_ai_prompt(attributes: Any) -> AiPromptResolveResult:
    """
    Kiểm tra attributes có đủ để sinh prompt AI không.
    Trả missing_slots / unmapped bằng nhãn tiếng Việt cho admin.
    """

    flat = _flatten_attributes(attributes)
    if not flat:
        return AiPromptResolveResult(
            available=False,
            missing_slots=[SLOT_LABELS_VI[s] for s in REQUIRED_SLOTS],
        )

    resolved: dict[str, str] = {}
    raw_by_slot: dict[str, str] = {}
    unmapped: list[str] = []

    for key, value in flat.items():
        slot = _slot_for_key(key)
        if slot is None:
            continue
        mapped = _map_value(slot, value)
        if mapped is None:
            label = SLOT_LABELS_VI.get(slot, slot)
            unmapped.append(f"{label}: {value}")
            continue
        resolved[slot] = mapped
        raw_by_slot[slot] = value

    missing = [SLOT_LABELS_VI[s] for s in REQUIRED_SLOTS if s not in resolved]
    if missing or unmapped:
        return AiPromptResolveResult(
            available=False,
            missing_slots=missing,
            unmapped=unmapped,
            slots_en=resolved,
        )

    prompt = build_prompt_from_slots(resolved)
    return AiPromptResolveResult(
        available=True,
        prompt=prompt,
        negative_prompt=NEGATIVE_PROMPT,
        slots_en=resolved,
    )
