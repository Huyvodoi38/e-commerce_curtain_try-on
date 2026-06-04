import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/app/layout/AdminLayout'
import { PublicLayout } from '@/app/layout/PublicLayout'
import { GuestOnly, RequireAdmin, RequireAuth, RequireStoreAccess } from '@/app/router/guards'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { AdminHomePage } from '@/features/admin-home/pages/AdminHomePage'
import { AdminStatsPage } from '@/features/admin-stats/pages/AdminStatsPage'
import { AdminCategoriesPage } from '@/features/admin-categories/pages/AdminCategoriesPage'
import { AdminProductsPage } from '@/features/admin-products/pages/AdminProductsPage'
import { AdminOrderDetailPage } from '@/features/admin-orders/pages/AdminOrderDetailPage'
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
import { StaffLogsPage } from '@/features/users/pages/StaffLogsPage'
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

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="auth/callback" element={<AuthCallbackPage />} />

          <Route element={<RequireStoreAccess />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />

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
        </Route>

        <Route path="admin" element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="stats" element={<AdminStatsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="promotions" element={<AdminPromotionsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id/logs" element={<CustomerLogsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/:id/logs" element={<StaffLogsPage />} />
            <Route path="logs" element={<SystemAuditLogsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
