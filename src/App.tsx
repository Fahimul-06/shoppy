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
import AdminProtectedRoute from './components/AdminProtectedRoute';

function Layout({ children }: { children: React.ReactNode }) {
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

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/seller/register" element={<SellerRegisterPage />} />
          <Route path="/seller/login" element={<SellerLoginPage />} />
          <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>} />
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/new-arrivals" element={<NewArrivalsPage />} />
                <Route path="/flash-sale" element={<FlashSalePage />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
