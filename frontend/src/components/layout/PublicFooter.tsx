import { Link } from 'react-router-dom'

export function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-surface-raised">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-brand">Curtain AI TryOn</p>
          <p className="mt-2 text-sm text-foreground-muted">
            Rèm cửa thông minh — thử màu AI trước khi mua (sắp ra mắt).
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Mua sắm</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
            <li>
              <Link to="/products" className="hover:text-brand">
                Sản phẩm
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-brand">
                Giỏ hàng
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Tài khoản</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
            <li>
              <Link to="/login" className="hover:text-brand">
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-brand">
                Đăng ký
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border-subtle py-4 text-center text-xs text-foreground-subtle">
        © {year} Curtain AI TryOn
      </div>
    </footer>
  )
}
