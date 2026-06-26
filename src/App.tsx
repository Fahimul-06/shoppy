import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import CartDrawer from './components/CartDrawer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CategoryPage from './pages/CategoryPage';
import CartPage from './pages/CartPage';
import AccountPage from './pages/AccountPage';
import CheckoutPage from './pages/CheckoutPage';
import SearchPage from './pages/SearchPage';
import NewArrivalsPage from './pages/NewArrivalsPage';
import FlashSalePage from './pages/FlashSalePage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminPage from './pages/admin/AdminPage';

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
          <Route path="/category/:slug" element={<StorePage><CategoryPage /></StorePage>} />
          <Route path="/cart" element={<StorePage><CartPage /></StorePage>} />
          <Route path="/checkout" element={<StorePage><CheckoutPage /></StorePage>} />
          <Route path="/search" element={<StorePage><SearchPage /></StorePage>} />
          <Route path="/new-arrivals" element={<StorePage><NewArrivalsPage /></StorePage>} />
          <Route path="/flash-sale" element={<StorePage><FlashSalePage /></StorePage>} />
          <Route path="/account" element={<AccountPage />} />

          {/* Seller routes */}
          <Route path="/seller/register" element={<SellerRegisterPage />} />
          <Route path="/seller/login" element={<SellerLoginPage />} />
          <Route path="/seller/dashboard" element={<SellerDashboardPage />} />

          {/* Admin routes. These are intentionally outside StoreLayout so the admin login page always renders cleanly. */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />

          <Route path="*" element={<StorePage><HomePage /></StorePage>} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
