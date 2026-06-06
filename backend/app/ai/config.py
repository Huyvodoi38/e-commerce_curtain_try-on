"""Hằng số inference AI — cố định, không expose cho người dùng."""

NEGATIVE_PROMPT = (
    "window frame distortion, messy, artifacts, bad anatomy, low quality, "
    "blurry, broken wall, ugly, text, watermark, cartoon, illustration, "
    "oversaturated, deformed window"
)

PROMPT_TAIL = (
    "highly detailed fabric texture, interior design photography, "
    "realistic lighting, natural shadows, 8k, sharp focus"
)

AI_INFERENCE_VERSION = "v1"

AI_INFERENCE = {
    "process_res": 768,
    "expansion": 50,
    "control_scale": 0.35,
    "num_inference_steps": 30,
    "guidance_scale": 7.5,
}

DEFAULT_TEXTURE_EN = "soft natural folds"
DEFAULT_HEADER_EN = "ceiling to floor"

# Nhãn slot (tiếng Việt) — dùng trong thông báo admin
SLOT_LABELS_VI: dict[str, str] = {
    "color": "Màu sắc",
    "material": "Chất liệu",
    "pattern": "Kiểu hoa văn",
    "opacity": "Độ che sáng",
    "texture": "Kiểu nếp",
    "header": "Kiểu treo",
}

REQUIRED_SLOTS = ("color", "material", "pattern", "opacity")
