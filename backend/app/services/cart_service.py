"""Nghiệp vụ giỏ hàng — chỉ customer, chỉ product_id + quantity."""

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.api.schemas.cart import (
    CartItemInput,
    CartItemReplace,
    CartLineItem,
    CartResponse,
)
from app.models.cart import Cart, CartItem
from app.models.common import utc_now
from app.models.product import Product
from app.models.user import User
from app.services.product_service import compute_effective_price
from app.utils.product_images import resolved_image_urls


async def get_cart(user: User) -> CartResponse:
    """Lấy giỏ — tự xóa SP không còn bán, tính subtotal."""

    cart = await _get_or_create_cart(user.id)
    removed = await _purge_unavailable_items(cart)
    return await _build_response(cart, removed_product_ids=removed)


async def replace_cart_items(user: User, items: list[CartItemReplace]) -> CartResponse:
    """Thay toàn bộ giỏ (đồng bộ đa thiết bị)."""

    cart = await _get_or_create_cart(user.id)
    new_items: list[CartItem] = []
    seen: set[str] = set()

    for row in items:
        if row.product_id in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trùng sản phẩm trong giỏ",
            )
        seen.add(row.product_id)
        product = await _get_sellable_product(row.product_id)
        if row.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng vượt tồn kho ({product.stock})",
            )
        new_items.append(
            CartItem(product_id=PydanticObjectId(row.product_id), quantity=row.quantity)
        )

    cart.items = new_items
    cart.updated_at = utc_now()
    await cart.save()
    removed = await _purge_unavailable_items(cart)
    return await _build_response(cart, removed_product_ids=removed)


async def add_cart_item(user: User, data: CartItemInput) -> CartResponse:
    """Thêm SP hoặc cộng dồn quantity."""

    product = await _get_sellable_product(data.product_id)
    cart = await _get_or_create_cart(user.id)
    oid = product.id

    for line in cart.items:
        if line.product_id == oid:
            new_qty = line.quantity + data.quantity
            if new_qty > product.stock:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số lượng vượt tồn kho ({product.stock})",
                )
            line.quantity = new_qty
            break
    else:
        if data.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng vượt tồn kho ({product.stock})",
            )
        cart.items.append(CartItem(product_id=oid, quantity=data.quantity))

    cart.updated_at = utc_now()
    await cart.save()
    return await _build_response(cart, removed_product_ids=[])


async def set_cart_item_quantity(
    user: User,
    product_id: str,
    quantity: int,
) -> CartResponse:
    """Đặt quantity; quantity=0 thì xóa dòng."""

    cart = await _get_or_create_cart(user.id)
    oid = _parse_product_id(product_id)

    if quantity == 0:
        cart.items = [line for line in cart.items if line.product_id != oid]
        cart.updated_at = utc_now()
        await cart.save()
        return await _build_response(cart, removed_product_ids=[])

    product = await _get_sellable_product(product_id)
    if quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số lượng vượt tồn kho ({product.stock})",
        )

    for line in cart.items:
        if line.product_id == oid:
            line.quantity = quantity
            break
    else:
        cart.items.append(CartItem(product_id=oid, quantity=quantity))

    cart.updated_at = utc_now()
    await cart.save()
    return await _build_response(cart, removed_product_ids=[])


async def remove_cart_item(user: User, product_id: str) -> CartResponse:
    """Xóa một SP khỏi giỏ."""

    cart = await _get_or_create_cart(user.id)
    oid = _parse_product_id(product_id)
    cart.items = [line for line in cart.items if line.product_id != oid]
    cart.updated_at = utc_now()
    await cart.save()
    return await _build_response(cart, removed_product_ids=[])


async def resolve_cart_lines_for_order(user: User) -> list[tuple[Product, int]]:
    """
    Dòng giỏ dùng khi checkout — purge SP không bán, validate tồn kho.

    Trả list rỗng nếu không còn SP (caller nên báo giỏ trống).
    """

    cart = await _get_or_create_cart(user.id)
    await _purge_unavailable_items(cart)
    lines: list[tuple[Product, int]] = []

    for line in cart.items:
        product = await Product.get(line.product_id)
        if product is None or not product.is_active:
            continue
        if line.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng vượt tồn kho ({product.stock}) cho {product.name}",
            )
        lines.append((product, line.quantity))

    return lines


async def clear_cart(user: User) -> CartResponse:
    """Xóa sạch giỏ."""

    cart = await _get_or_create_cart(user.id)
    cart.items = []
    cart.updated_at = utc_now()
    await cart.save()
    return await _build_response(cart, removed_product_ids=[])


async def _get_or_create_cart(user_id: PydanticObjectId) -> Cart:
    cart = await Cart.find_one(Cart.user_id == user_id)
    if cart is not None:
        return cart
    cart = Cart(user_id=user_id, items=[], updated_at=utc_now())
    await cart.insert()
    return cart


async def _purge_unavailable_items(cart: Cart) -> list[str]:
    """Xóa SP không tồn tại hoặc is_active=false; trả về id đã xóa."""

    if not cart.items:
        return []

    removed: list[str] = []
    kept: list[CartItem] = []

    for line in cart.items:
        product = await Product.get(line.product_id)
        if product is None or not product.is_active:
            removed.append(str(line.product_id))
            continue
        kept.append(line)

    if removed:
        cart.items = kept
        cart.updated_at = utc_now()
        await cart.save()

    return removed


async def _build_response(cart: Cart, *, removed_product_ids: list[str]) -> CartResponse:
    lines: list[CartLineItem] = []
    subtotal = 0
    item_count = 0

    for line in cart.items:
        product = await Product.get(line.product_id)
        if product is None or not product.is_active:
            continue
        unit_price, _ = compute_effective_price(product.price, product.sale_price)
        line_total = unit_price * line.quantity
        urls = resolved_image_urls(product.image_urls, product.display_image_url)
        lines.append(
            CartLineItem(
                product_id=str(product.id),
                name=product.name,
                quantity=line.quantity,
                unit_price=unit_price,
                line_total=line_total,
                stock=product.stock,
                display_image_url=urls[0] if urls else None,
            )
        )
        subtotal += line_total
        item_count += line.quantity

    return CartResponse(
        items=lines,
        subtotal=subtotal,
        item_count=item_count,
        updated_at=cart.updated_at,
        removed_product_ids=removed_product_ids,
    )


async def _get_sellable_product(product_id: str) -> Product:
    """SP phải tồn tại và đang bán."""

    oid = _parse_product_id(product_id)
    product = await Product.get(oid)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sản phẩm không còn được bán",
        )
    return product


def _parse_product_id(product_id: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(product_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm",
        ) from exc
