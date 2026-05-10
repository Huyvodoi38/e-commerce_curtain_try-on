"""AI Engine cho tính năng Try-on rèm cửa.

Module này đóng gói lại toàn bộ pipeline trong notebook nghiên cứu:
- Segment Anything (SAM - vit_b) để phân vùng cửa sổ.
- Depth Estimation (DPT) thay cho Canny làm input cho ControlNet.
- Stable Diffusion 1.5 + ControlNet Depth + Inpainting để vẽ rèm.

Nguyên tắc tối ưu bộ nhớ:
- Lazy load: chỉ load model khi gọi lần đầu, có thể preload qua biến môi trường.
- Singleton: dùng chung 1 instance trong toàn bộ app.
- `enable_model_cpu_offload` cho Stable Diffusion để tiết kiệm VRAM.
- Gọi `torch.cuda.empty_cache()` sau mỗi lần generate.
- Cho phép `unload()` thủ công khi cần giải phóng bộ nhớ.
"""
from __future__ import annotations

import logging
import threading
from functools import lru_cache
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image, ImageFilter

from config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper functions (port từ notebook)
# ---------------------------------------------------------------------------
def dilate_mask(mask_array: np.ndarray, expansion_amount: int) -> np.ndarray:
    """Nới rộng vùng mask để rèm phủ kín mép cửa, tránh hở viền."""
    if expansion_amount <= 0:
        return mask_array
    kernel_size = max(1, int(expansion_amount))
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    return cv2.dilate(mask_array, kernel, iterations=1)


# ---------------------------------------------------------------------------
# AI Engine
# ---------------------------------------------------------------------------
class AIEngine:
    """Đóng gói SAM + Depth + Stable Diffusion ControlNet Inpainting."""

    def __init__(self) -> None:
        settings = get_settings()
        self.sam_checkpoint = settings.sam_checkpoint
        self.sam_model_type = settings.sam_model_type
        self.sd_model_id = settings.sd_model_id
        self.controlnet_model_id = settings.controlnet_model_id
        self.depth_model_id = settings.depth_model_id

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32

        self._sam_predictor = None
        self._depth_estimator = None
        self._pipe = None

        # Khoá để tránh load model song song trong môi trường multi-thread
        self._load_lock = threading.Lock()

    # ------------------------------------------------------------------
    # Load / Unload
    # ------------------------------------------------------------------
    def load_models(self) -> None:
        """Load tất cả model cần thiết. Idempotent: gọi nhiều lần vẫn an toàn."""
        if self._sam_predictor is not None and self._pipe is not None:
            return

        with self._load_lock:
            # Kiểm tra lại trong lock để tránh race condition
            if self._sam_predictor is not None and self._pipe is not None:
                return

            logger.info("Đang chạy AI Engine trên thiết bị: %s", self.device)
            self._load_sam()
            self._load_depth()
            self._load_stable_diffusion()
            logger.info("AI Engine sẵn sàng.")

    def _load_sam(self) -> None:
        """Load Segment Anything (vit_b cho nhẹ)."""
        from segment_anything import SamPredictor, sam_model_registry

        logger.info("Đang load SAM (%s) từ %s ...", self.sam_model_type, self.sam_checkpoint)
        sam = sam_model_registry[self.sam_model_type](checkpoint=self.sam_checkpoint)
        sam.to(device=self.device)
        self._sam_predictor = SamPredictor(sam)

    def _load_depth(self) -> None:
        """Load Depth Estimator (Intel/dpt-large) thay cho Canny."""
        from transformers import pipeline

        logger.info("Đang load Depth Estimator: %s ...", self.depth_model_id)
        self._depth_estimator = pipeline(
            "depth-estimation",
            model=self.depth_model_id,
            device=0 if self.device == "cuda" else -1,
        )

    def _load_stable_diffusion(self) -> None:
        """Load Stable Diffusion + ControlNet Depth Inpainting."""
        from diffusers import (
            ControlNetModel,
            StableDiffusionControlNetInpaintPipeline,
            UniPCMultistepScheduler,
        )

        logger.info("Đang load ControlNet Depth: %s ...", self.controlnet_model_id)
        controlnet = ControlNetModel.from_pretrained(
            self.controlnet_model_id,
            torch_dtype=self.dtype,
        )

        logger.info("Đang load Stable Diffusion: %s ...", self.sd_model_id)
        pipe = StableDiffusionControlNetInpaintPipeline.from_pretrained(
            self.sd_model_id,
            controlnet=controlnet,
            torch_dtype=self.dtype,
            safety_checker=None,
        )
        pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)

        # Tối ưu bộ nhớ: offload sang CPU khi không dùng module nào
        if self.device == "cuda":
            pipe.enable_model_cpu_offload()
            try:
                pipe.enable_xformers_memory_efficient_attention()
            except Exception:
                logger.warning("xformers không khả dụng, bỏ qua.")
        else:
            pipe.to(self.device)

        self._pipe = pipe

    def unload(self) -> None:
        """Giải phóng toàn bộ model khỏi VRAM/RAM."""
        with self._load_lock:
            self._sam_predictor = None
            self._depth_estimator = None
            self._pipe = None
            if self.device == "cuda":
                torch.cuda.empty_cache()
            logger.info("Đã unload AI Engine.")

    # ------------------------------------------------------------------
    # Pipeline xử lý
    # ------------------------------------------------------------------
    def get_depth_map(self, image: Image.Image) -> Image.Image:
        """Tạo depth map dạng RGB để đưa vào ControlNet."""
        if self._depth_estimator is None:
            self.load_models()

        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)

        depth_result = self._depth_estimator(image)["depth"]
        depth_arr = np.array(depth_result)
        depth_arr = depth_arr[:, :, None]
        depth_arr = np.concatenate([depth_arr, depth_arr, depth_arr], axis=2)
        return Image.fromarray(depth_arr)

    def segment_window(
        self, image_pil: Image.Image, bbox: np.ndarray
    ) -> np.ndarray:
        """Dùng SAM lấy mask vùng cửa sổ theo bounding box."""
        if self._sam_predictor is None:
            self.load_models()

        self._sam_predictor.set_image(np.array(image_pil))
        masks, _, _ = self._sam_predictor.predict(
            point_coords=None,
            point_labels=None,
            box=bbox[None, :],
            multimask_output=False,
        )
        return (masks[0] * 255).astype(np.uint8)

    def run_tryon(
        self,
        image: Image.Image,
        prompt: str,
        negative_prompt: str = "",
        bbox: Optional[Tuple[int, int, int, int]] = None,
        expansion: int = 50,
        control_scale: float = 0.35,
        process_res: int = 768,
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> Image.Image:
        """Chạy toàn bộ pipeline try-on rèm.

        Args:
            image: Ảnh gốc của khách (PIL).
            prompt: Mô tả mẫu rèm.
            negative_prompt: Negative prompt.
            bbox: (x_min, y_min, x_max, y_max). Nếu None → dùng full ảnh.
            expansion: Pixel mở rộng mask (sau khi scale).
            control_scale: Trọng số ControlNet (0.1 - 1.0).
            process_res: Độ phân giải xử lý (512 - 1024). Càng cao càng nét, càng chậm.
            num_inference_steps: Số bước denoise.
            guidance_scale: CFG scale.

        Returns:
            PIL.Image đã được resize về kích thước gốc.
        """
        # Đảm bảo model đã sẵn sàng
        self.load_models()

        image_pil = image.convert("RGB")
        w_orig, h_orig = image_pil.size
        process_size = int(process_res)

        logger.info("Try-on size = %dx%d, prompt = %s", process_size, process_size, prompt[:60])

        image_resized = image_pil.resize(
            (process_size, process_size), resample=Image.LANCZOS
        )

        # ---- Bước 1: Tính bounding box cho SAM ----
        if bbox is None:
            bbox_arr = np.array([0, 0, w_orig, h_orig])
        else:
            x_min, y_min, x_max, y_max = bbox
            x_min = max(0, min(w_orig - 1, x_min))
            x_max = max(1, min(w_orig, x_max))
            y_min = max(0, min(h_orig - 1, y_min))
            y_max = max(1, min(h_orig, y_max))
            bbox_arr = np.array([x_min, y_min, x_max, y_max])

        # ---- Bước 2: SAM lấy mask cửa sổ ----
        sam_mask_uint8 = self.segment_window(image_pil, bbox_arr)

        mask_pil_temp = Image.fromarray(sam_mask_uint8).resize(
            (process_size, process_size), resample=Image.NEAREST
        )
        mask_np_temp = np.array(mask_pil_temp)

        # ---- Bước 3: Nới rộng + làm mịn mask ----
        scaled_expansion = int(expansion * (process_size / 512))
        mask_dilated_np = dilate_mask(mask_np_temp, scaled_expansion)
        mask_pil = Image.fromarray(mask_dilated_np).convert("L")
        mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(radius=5))

        # ---- Bước 4: Làm mờ vùng rèm để inpaint mượt hơn ----
        blurred_image = image_resized.filter(ImageFilter.GaussianBlur(radius=30))
        image_for_inpaint_pil = Image.composite(
            blurred_image, image_resized, mask_pil
        )

        # ---- Bước 5: Depth map cho ControlNet ----
        control_image = self.get_depth_map(image_resized)

        # Giải phóng bớt VRAM trước khi chạy SD
        if self.device == "cuda":
            torch.cuda.empty_cache()

        # ---- Bước 6: Stable Diffusion ControlNet Inpainting ----
        output = self._pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=image_for_inpaint_pil,
            mask_image=mask_pil,
            control_image=control_image,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            controlnet_conditioning_scale=control_scale,
        ).images[0]

        if self.device == "cuda":
            torch.cuda.empty_cache()

        return output.resize((w_orig, h_orig), resample=Image.LANCZOS)


# ---------------------------------------------------------------------------
# Singleton + dependency cho FastAPI
# ---------------------------------------------------------------------------
@lru_cache
def get_ai_engine() -> AIEngine:
    """Trả về AIEngine singleton dùng chung cho cả app."""
    return AIEngine()
