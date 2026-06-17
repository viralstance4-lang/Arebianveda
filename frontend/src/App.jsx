import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import OrdersPage from './pages/OrdersPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import BlogPage from './pages/BlogPage'
import BlogDetail from './pages/BlogDetailPage'
import PolicyPage from './pages/PolicyPage'
import AdminRoute from './components/auth/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminProductForm from './pages/admin/AdminProductForm'
import AdminBlogs from './pages/admin/AdminBlogs'
import AdminBlogForm from './pages/admin/AdminBlogForm'
import AdminBlogCategories from './pages/admin/AdminBlogCategories'
import AdminBlogTags from './pages/admin/AdminBlogTags'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminSettings from './pages/admin/AdminSettings'
import AdminCategories from './pages/admin/AdminCategories'
import AdminFAQs from './pages/admin/AdminFAQs'
import AdminReviews from './pages/admin/AdminReviews'
import AdminPolicies from './pages/admin/AdminPolicies'
import AdminMedia from './pages/admin/AdminMedia'
import AdminLogos from './pages/admin/AdminLogos'
import AdminBanners from './pages/admin/AdminBanners'
import AdminConcerns from './pages/admin/AdminConcerns'
import AdminPaymentSettings from './pages/admin/AdminPaymentSettings'

function SiteLayout() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#FFFDF5', color: '#0A2D19', border: '1px solid #0F3D22' },
        }}
      />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/"             element={<HomePage />} />
          <Route path="/shop"         element={<ShopPage />} />
          <Route path="/products"     element={<ShopPage />} />
          <Route path="/store"        element={<ShopPage />} />
          <Route path="/shop/:slug"   element={<ProductPage />} />
          <Route path="/cart"         element={<CartPage />} />
          <Route path="/checkout"     element={<CheckoutPage />} />
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/register"     element={<RegisterPage />} />
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="/orders"       element={<OrdersPage />} />
          <Route path="/about"        element={<AboutPage />} />
          <Route path="/contact"      element={<ContactPage />} />
          <Route path="/blog"         element={<Navigate to="/blogs" replace />} />
          <Route path="/blogs"        element={<BlogPage />} />
          <Route path="/blog/:slug"   element={<BlogDetail />} />
          <Route path="/policy/:slug" element={<PolicyPage />} />
        </Route>

        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index                    element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"         element={<AdminDashboard />} />
          <Route path="products"          element={<AdminProducts />} />
          <Route path="products/new"      element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="blogs"             element={<AdminBlogs />} />
          <Route path="blogs/new"         element={<AdminBlogForm />} />
          <Route path="blogs/:id/edit"    element={<AdminBlogForm />} />
          <Route path="categories"        element={<AdminCategories />} />
          <Route path="blog-categories"   element={<AdminBlogCategories />} />
          <Route path="blog-tags"         element={<AdminBlogTags />} />
          <Route path="orders"            element={<AdminOrders />} />
          <Route path="users"             element={<AdminUsers />} />
          <Route path="reviews"           element={<AdminReviews />} />
          <Route path="coupons"           element={<AdminCoupons />} />
          <Route path="faqs"              element={<AdminFAQs />} />
          <Route path="policies"          element={<AdminPolicies />} />
          <Route path="media"             element={<AdminMedia />} />
          <Route path="logos"             element={<AdminLogos />} />
          <Route path="banners"           element={<AdminBanners />} />
          <Route path="concerns"          element={<AdminConcerns />} />
          <Route path="settings"          element={<AdminSettings />} />
          <Route path="payment-settings"  element={<AdminPaymentSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
