import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import CartDrawer from './components/CartDrawer';
import CustomerCareChat from './components/CustomerCareChat';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CategoryPage from './pages/CategoryPage';
import CartPage from './pages/CartPage';
import AccountPage from './pages/AccountPage';
import CheckoutPage from './pages/CheckoutPage';
import SearchPage from './pages/SearchPage';
import NewArrivalsPage from './pages/NewArrivalsPage';
import FlashSalePage from './pages/FlashSalePage';
import DailySalePage from './pages/DailySalePage';
import OrdersPage from './pages/OrdersPage';
import WishlistPage from './pages/WishlistPage';
import CouponsPage from './pages/CouponsPage';
import ReturnsPage from './pages/ReturnsPage';
import CancellationsPage from './pages/CancellationsPage';
import NotificationsPage from './pages/NotificationsPage';
import SellerShopPage from './pages/SellerShopPage';
import DisplayProductsPage from './pages/DisplayProductsPage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminPage from './pages/admin/AdminPage';
import DeliveryLoginPage from './pages/delivery/DeliveryLoginPage';
import DeliveryDashboardPage from './pages/delivery/DeliveryDashboardPage';
import DeliveryCallRoomPage from './pages/delivery/DeliveryCallRoomPage';
import DeliverySupportPage from './pages/delivery/DeliverySupportPage';
import DeliveryOrdersPage from './pages/delivery/DeliveryOrdersPage';
import HelpCenterPage from './pages/HelpCenterPage';
import HowToBuyPage from './pages/HowToBuyPage';
import ReturnsRefundsPage from './pages/ReturnsRefundsPage';
import ContactUsPage from './pages/ContactUsPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AboutShoppyPage from './pages/AboutShoppyPage';
import CareersPage from './pages/CareersPage';
import BlogPage from './pages/BlogPage';
import PressRoomPage from './pages/PressRoomPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import SitemapPage from './pages/SitemapPage';
import { ADMIN_LOGIN_PATH, ADMIN_PORTAL_PATH, SELLER_LOGIN_PATH, SELLER_REGISTER_PATH, SELLER_DASHBOARD_PATH, DELIVERY_LOGIN_PATH, DELIVERY_DASHBOARD_PATH, DELIVERY_ORDERS_PATH, DELIVERY_SUPPORT_PATH } from './lib/adminPortal';

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0 flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
      <CartDrawer />
    </div>
  );
}

function StorePage({ children }: { children: React.ReactNode }) {
  return <StoreLayout>{children}</StoreLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          {/* Public store routes */}
          <Route path="/" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/product/:id" element={<StorePage><ProductPage /></StorePage>} />
          <Route path="/shop/:id" element={<StorePage><SellerShopPage /></StorePage>} />
          <Route path="/display/:id" element={<StorePage><DisplayProductsPage /></StorePage>} />
          <Route path="/category/:slug" element={<StorePage><CategoryPage /></StorePage>} />
          <Route path="/cart" element={<StorePage><CartPage /></StorePage>} />
          <Route path="/checkout" element={<StorePage><CheckoutPage /></StorePage>} />
          <Route path="/search" element={<StorePage><SearchPage /></StorePage>} />
          <Route path="/new-arrivals" element={<StorePage><NewArrivalsPage /></StorePage>} />
          <Route path="/flash-sale" element={<StorePage><FlashSalePage /></StorePage>} />
          <Route path="/daily-sale" element={<StorePage><DailySalePage /></StorePage>} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/orders" element={<StorePage><OrdersPage /></StorePage>} />
          <Route path="/wishlist" element={<StorePage><WishlistPage /></StorePage>} />
          <Route path="/coupons" element={<StorePage><CouponsPage /></StorePage>} />
          <Route path="/returns" element={<StorePage><ReturnsPage /></StorePage>} />
          <Route path="/cancellations" element={<StorePage><CancellationsPage /></StorePage>} />
          <Route path="/notifications" element={<StorePage><NotificationsPage /></StorePage>} />
          <Route path="/help-center" element={<StorePage><HelpCenterPage /></StorePage>} />
          <Route path="/how-to-buy" element={<StorePage><HowToBuyPage /></StorePage>} />
          <Route path="/returns-refunds" element={<StorePage><ReturnsRefundsPage /></StorePage>} />
          <Route path="/contact-us" element={<StorePage><ContactUsPage /></StorePage>} />
          <Route path="/order-tracking" element={<StorePage><OrderTrackingPage /></StorePage>} />
          <Route path="/about-shoppy" element={<StorePage><AboutShoppyPage /></StorePage>} />
          <Route path="/careers" element={<StorePage><CareersPage /></StorePage>} />
          <Route path="/blog" element={<StorePage><BlogPage /></StorePage>} />
          <Route path="/press-room" element={<StorePage><PressRoomPage /></StorePage>} />
          <Route path="/privacy-policy" element={<StorePage><PrivacyPolicyPage /></StorePage>} />
          <Route path="/terms-conditions" element={<StorePage><TermsConditionsPage /></StorePage>} />
          <Route path="/cookie-policy" element={<StorePage><CookiePolicyPage /></StorePage>} />
          <Route path="/sitemap" element={<StorePage><SitemapPage /></StorePage>} />

          {/* Seller routes */}
          <Route path={SELLER_REGISTER_PATH} element={<SellerRegisterPage />} />
          <Route path={SELLER_LOGIN_PATH} element={<SellerLoginPage />} />
          <Route path={`${SELLER_DASHBOARD_PATH}/*`} element={<SellerDashboardPage />} />

          {/* Delivery routes */}
          <Route path={DELIVERY_LOGIN_PATH} element={<DeliveryLoginPage />} />
          <Route path={DELIVERY_DASHBOARD_PATH} element={<DeliveryDashboardPage />} />
          <Route path={DELIVERY_ORDERS_PATH} element={<DeliveryOrdersPage />} />
          <Route path={DELIVERY_SUPPORT_PATH} element={<DeliverySupportPage />} />
          <Route path="/call/:roomId" element={<DeliveryCallRoomPage />} />

          {/* Hidden admin portal. Set VITE_ADMIN_PORTAL_SLUG to change this private URL. */}
          <Route path={ADMIN_LOGIN_PATH} element={<AdminLoginPage />} />
          <Route path={`${ADMIN_PORTAL_PATH}/*`} element={<AdminPage />} />



          {/* Old/public seller URLs are disabled so only the private seller portal path works. */}
          <Route path="/seller/register" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/seller/login" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/seller/dashboard/*" element={<StorePage><HomePage /></StorePage>} />

          {/* Old/public delivery URLs are disabled so only the private delivery portal path works. */}
          <Route path="/delivery/login" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/delivery" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/delivery/orders" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/delivery/support" element={<StorePage><HomePage /></StorePage>} />

          {/* Old/public admin URLs are intentionally disabled so visitors cannot discover the portal from common paths. */}
          <Route path="/admin/login" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/admin-login" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/admin" element={<StorePage><HomePage /></StorePage>} />
          <Route path="/admin/*" element={<StorePage><HomePage /></StorePage>} />

          <Route path="*" element={<StorePage><HomePage /></StorePage>} />
        </Routes>
        <CustomerCareChat />
      </CartProvider>
    </BrowserRouter>
  );
}
