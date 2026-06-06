"""Enum nghiệp vụ dùng chung cho các document."""

from enum import Enum


class UserRole(str, Enum):
    """
    Vai trò người dùng.

    - customer: khách hàng (đăng ký public / Google).
    - staff: nhân viên — xử lý đơn, cập nhật tồn kho.
    - manager: quản lý — CRUD sản phẩm, KM, quản lý user.
    """

    CUSTOMER = "customer"
    STAFF = "staff"
    MANAGER = "manager"


class AuthProvider(str, Enum):
    """Nguồn đăng ký / đăng nhập chính của tài khoản."""

    LOCAL = "local"  # username + mật khẩu
    GOOGLE = "google"  # email qua OAuth


class OAuthProvider(str, Enum):
    """Nhà cung cấp OAuth được hỗ trợ."""

    GOOGLE = "google"


class OrderStatus(str, Enum):
    """Trạng thái vận hành giao hàng (không gồm thanh toán — xem PaymentStatus)."""

    PENDING = "pending"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    """Phương thức thanh toán."""

    OFFLINE = "offline"
    VNPAY = "vnpay"


class PaymentProvider(str, Enum):
    """Nhà cung cấp thanh toán online."""

    VNPAY = "vnpay"


class PaymentTransactionStatus(str, Enum):
    """Trạng thái phiên thanh toán VNPay."""

    INITIATED = "initiated"
    SUCCESS = "success"
    FAILED = "failed"
    EXPIRED = "expired"


class PaymentStatus(str, Enum):
    """Trạng thái thanh toán — MVP: unpaid → paid (staff xác nhận)."""

    UNPAID = "unpaid"
    PAID = "paid"


class OfflineSubtype(str, Enum):
    """Loại thanh toán offline — chỉ ảnh hưởng hiển thị / báo cáo."""

    COD = "cod"
    BANK = "bank"


class DiscountType(str, Enum):
    """Loại giảm giá của mã khuyến mãi."""

    PERCENTAGE = "percentage"
    FIXED = "fixed"


class AIStatus(str, Enum):
    """Trạng thái xử lý AI try-on (phase cuối)."""

    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReviewSource(str, Enum):
    """Nguồn tạo đánh giá."""

    CUSTOMER = "customer"
    ADMIN = "admin"


class ActivityAction(str, Enum):
    """Hành động ghi vào activity log."""

    USER_REGISTERED = "user.registered"
    USER_REGISTERED_GOOGLE = "user.registered_google"
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DEACTIVATED = "user.deactivated"
    USER_ACTIVATED = "user.activated"
    ORDER_CREATED = "order.created"
    ORDER_CREATED_BUY_NOW = "order.created_buy_now"
    ORDER_CANCELLED = "order.cancelled"
    ORDER_PAYMENT_CONFIRMED = "order.payment_confirmed"
    ORDER_SHIPPED = "order.shipped"
    ORDER_DELIVERED = "order.delivered"
    ORDER_CANCELLED_BY_STAFF = "order.cancelled_by_staff"
    ORDER_PAYMENT_VNPAY = "order.payment_vnpay"
    ORDER_CANCELLED_VNPAY_EXPIRED = "order.cancelled_vnpay_expired"
    REVIEW_CREATED = "review.created"
    REVIEW_CREATED_ADMIN = "review.created_admin"
    REVIEW_DELETED = "review.deleted"
    REVIEW_DELETED_ADMIN = "review.deleted_admin"
