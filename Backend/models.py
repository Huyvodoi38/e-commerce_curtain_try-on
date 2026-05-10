"""Pydantic models / schemas cho website bán rèm + AI Try-on.

Các model được chia làm 2 nhóm:
- Document model (lưu xuống MongoDB)
- Request/Response model (giao tiếp qua API)
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated, Any, List, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, GetCoreSchemaHandler
from pydantic_core import core_schema


# ---------------------------------------------------------------------------
# Helper: cho phép Pydantic hiểu ObjectId của MongoDB
# ---------------------------------------------------------------------------
class PyObjectId(ObjectId):
    """ObjectId tương thích Pydantic v2."""

    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, value: Any) -> ObjectId:
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str) and ObjectId.is_valid(value):
            return ObjectId(value)
        raise ValueError("ObjectId không hợp lệ")


PydanticObjectId = Annotated[PyObjectId, Field(default_factory=PyObjectId, alias="_id")]


class MongoBaseModel(BaseModel):
    """Base model cho mọi document MongoDB."""

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )


# ---------------------------------------------------------------------------
# 1. NGƯỜI DÙNG
# ---------------------------------------------------------------------------
class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: UserRole = UserRole.CUSTOMER


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserInDB(MongoBaseModel, UserBase):
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserPublic(UserBase):
    id: str = Field(..., alias="_id")

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# 2. DANH MỤC RÈM
# ---------------------------------------------------------------------------
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryInDB(MongoBaseModel, CategoryBase):
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# 3. SẢN PHẨM RÈM
# ---------------------------------------------------------------------------
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: float = Field(..., ge=0)
    currency: str = Field(default="VND", max_length=8)
    category_slug: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    thumbnail: Optional[str] = None
    in_stock: bool = True

    # Thông tin riêng cho AI Try-on
    ai_prompt: str = Field(
        default="",
        description="Prompt mô tả mẫu rèm này khi đưa vào Stable Diffusion.",
    )
    ai_negative_prompt: str = Field(
        default="window frame distortion, messy, artifacts, low quality, blurry, watermark",
        description="Negative prompt mặc định cho mẫu rèm.",
    )


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    images: Optional[List[str]] = None
    thumbnail: Optional[str] = None
    in_stock: Optional[bool] = None
    ai_prompt: Optional[str] = None
    ai_negative_prompt: Optional[str] = None


class ProductInDB(MongoBaseModel, ProductBase):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# 4. ĐƠN HÀNG
# ---------------------------------------------------------------------------
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0)


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPING = "shipping"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderBase(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: str
    note: Optional[str] = None
    items: List[OrderItem]


class OrderCreate(OrderBase):
    pass


class OrderInDB(MongoBaseModel, OrderBase):
    user_id: Optional[str] = None
    total: float = 0.0
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# 5. AI TRY-ON
# ---------------------------------------------------------------------------
class TryOnRequest(BaseModel):
    """Tham số tuỳ chỉnh khi gọi API try-on (multipart/form-data)."""

    product_id: Optional[str] = Field(
        default=None,
        description="ID sản phẩm rèm muốn thử. Nếu có sẽ ưu tiên prompt của sản phẩm.",
    )
    prompt: Optional[str] = Field(default=None, description="Prompt tuỳ chỉnh.")
    negative_prompt: Optional[str] = None

    x_min: int = 0
    y_min: int = 0
    x_max: int = 0
    y_max: int = 0

    expansion: int = Field(default=50, ge=0, le=200)
    control_scale: float = Field(default=0.35, ge=0.0, le=1.0)
    process_res: int = Field(default=768, ge=384, le=1024)


class TryOnHistoryItem(MongoBaseModel):
    user_id: Optional[str] = None
    product_id: Optional[str] = None
    prompt: str
    negative_prompt: str
    input_image_url: Optional[str] = None
    output_image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
