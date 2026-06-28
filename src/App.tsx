import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import CartDrawer from './components/CartDrawer';
import CustomerCareChat from './components/CustomerCareChat';
import HeaderDisplayBanner from './components/HeaderDisplayBanner';
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

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0 flex flex-col">
      <Header />
      <HeaderDisplayBanner />
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

          {/* Seller routes */}
          <Route path="/seller/register" element={<SellerRegisterPage />} />
          <Route path="/seller/login" element={<SellerLoginPage />} />
          <Route path="/seller/dashboard/*" element={<SellerDashboardPage />} />

          {/* Admin routes. These are intentionally outside StoreLayout so the admin login page always renders cleanly. */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />

          <Route path="*" element={<StorePage><HomePage /></StorePage>} />
        </Routes>
        <CustomerCareChat />
      </CartProvider>
    </BrowserRouter>
  );
}
