import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/app/layout/AdminLayout'
import { PublicLayout } from '@/app/layout/PublicLayout'
import { GuestOnly, RequireAdmin, RequireAuth } from '@/app/router/guards'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { AdminOrdersPage } from '@/features/admin-orders/pages/AdminOrdersPage'
import { SystemAuditLogsPage } from '@/features/audit-logs/pages/SystemAuditLogsPage'
import { CartPage } from '@/features/cart/pages/CartPage'
import { CheckoutPage } from '@/features/orders/pages/CheckoutPage'
import { MyOrderDetailPage } from '@/features/orders/pages/MyOrderDetailPage'
import { MyOrdersPage } from '@/features/orders/pages/MyOrdersPage'
import { OrderPayPage } from '@/features/orders/pages/OrderPayPage'
import { OrderPayReturnPage } from '@/features/orders/pages/OrderPayReturnPage'
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage'
import { ProductListPage } from '@/features/products/pages/ProductListPage'
import { AdminPromotionsPage } from '@/features/promotions/pages/AdminPromotionsPage'
import { CustomerLogsPage } from '@/features/users/pages/CustomerLogsPage'
import { CustomersPage } from '@/features/users/pages/CustomersPage'
import { StaffPage } from '@/features/users/pages/StaffPage'
import { PageShell } from '@/components/common/PageShell'

function HomePage() {
  return (
    <PageShell
      title="Curtain AI TryOn"
      description="Frontend scaffold — bắt đầu từ Sprint: Auth → Products → Cart → Checkout"
    />
  )
}

function AdminDashboardPage() {
  return <PageShell title="Bảng điều khiển" description="Chọn mục từ menu bên trái" />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />

          <Route element={<RequireAuth roles={['customer']} />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<MyOrdersPage />} />
            <Route path="orders/:id/pay" element={<OrderPayPage />} />
            <Route path="orders/:id/pay/return" element={<OrderPayReturnPage />} />
            <Route path="orders/:id" element={<MyOrderDetailPage />} />
          </Route>

          <Route element={<GuestOnly />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>
        </Route>

        <Route path="admin" element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="promotions" element={<AdminPromotionsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id/logs" element={<CustomerLogsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="logs" element={<SystemAuditLogsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
