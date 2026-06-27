import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, User, Menu, X, ChevronDown, ChevronRight,
  Grid3X3, Store, Camera, Loader2, Bell,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { categories } from '../data/categories';
import { products } from '../data/products';

import { subSubMap } from '../data/categoryOptions';
import { searchProductsByImage } from '../lib/db';
import { api, getToken } from '../lib/api';

const categoryUrl = (categorySlug: string, sub?: string, child?: string) => {
  const params = new URLSearchParams();
  if (sub) params.set('sub', sub);
  if (child) params.set('child', child);
  const qs = params.toString();
  return `/category/${categorySlug}${qs ? `?${qs}` : ''}`;
};

// ── 3-column Mega Dropdown ────────────────────────────────────────────────────
function MegaDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [activeCatSlug, setActiveCatSlug] = useState(categories[0].slug);
  const [activeSub, setActiveSub] = useState<string>(() => {
    const subs = Object.keys(subSubMap[categories[0].slug] ?? {});
    return subs[0] ?? '';
  });

  const handleCatEnter = (slug: string) => {
    setActiveCatSlug(slug);
    const subs = Object.keys(subSubMap[slug] ?? {});
    setActiveSub(subs[0] ?? '');
  };

  const goToCategory = (path: string) => {
    navigate(path);
    onClose();
  };

  const activeCategory = categories.find((c) => c.slug === activeCatSlug)!;
  const subcategories = Object.keys(subSubMap[activeCatSlug] ?? {});
  const subSubItems = subSubMap[activeCatSlug]?.[activeSub] ?? [];
  const featuredProduct = products.find((p) => p.category === activeCatSlug);

  return (
    <div
      className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex"
      style={{ width: '860px' }}
    >
      {/* ── Column 1: All categories ─────────────────────────────────────── */}
      <div className="w-48 flex-shrink-0 bg-gray-50 border-r border-gray-100 py-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-1 pb-2">Categories</p>
        {categories.map((cat) => {
          const active = cat.slug === activeCatSlug;
          return (
            <button
              key={cat.id}
              onMouseEnter={() => handleCatEnter(cat.slug)}
              onClick={() => goToCategory(categoryUrl(cat.slug))}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group ${
                active ? 'bg-white border-r-2 border-orange-500' : 'hover:bg-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border transition-colors ${
                active ? 'border-orange-300' : 'border-gray-200 group-hover:border-orange-200'
              }`}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <span className={`text-xs font-medium flex-1 leading-tight transition-colors ${
                active ? 'text-orange-600' : 'text-gray-700 group-hover:text-orange-500'
              }`}>{cat.name}</span>
              <ChevronRight size={11} className={`flex-shrink-0 ${active ? 'text-orange-400' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </div>

      {/* ── Column 2: Subcategories ──────────────────────────────────────── */}
      <div className="w-48 flex-shrink-0 border-r border-gray-100 py-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
        <div className="flex items-center justify-between px-3 pt-1 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeCategory.name}</p>
          <Link
            to={categoryUrl(activeCatSlug)}
            onClick={onClose}
            className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            All
          </Link>
        </div>
        {subcategories.map((sub) => {
          const active = sub === activeSub;
          return (
            <button
              key={sub}
              onMouseEnter={() => setActiveSub(sub)}
              onClick={() => goToCategory(categoryUrl(activeCatSlug, sub))}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors group ${
                active ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-500'
              }`}
            >
              <span className="leading-tight">{sub}</span>
              <ChevronRight size={11} className={`flex-shrink-0 ${active ? 'text-orange-400' : 'text-gray-300 group-hover:text-orange-300'}`} />
            </button>
          );
        })}
      </div>

      {/* ── Column 3: Sub-sub-categories + featured product ─────────────── */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: '520px' }}>
        {/* Sub-category heading */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-sm">{activeSub || activeCategory.name}</h3>
          <Link
            to={categoryUrl(activeCatSlug, activeSub || undefined)}
            onClick={onClose}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight size={11} />
          </Link>
        </div>

        {/* Sub-sub-category grid */}
        {subSubItems.length > 0 && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-4">
            {subSubItems.map((item) => (
              <Link
                key={item}
                to={categoryUrl(activeCatSlug, activeSub, item)}
                onClick={onClose}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-orange-50 hover:text-orange-600 text-xs text-gray-600 transition-colors group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-orange-400 transition-colors flex-shrink-0" />
                {item}
              </Link>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 mb-3" />

        {/* Featured product */}
        {featuredProduct && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Featured</p>
            <Link
              to={`/product/${featuredProduct.id}`}
              onClick={onClose}
              className="flex gap-3 bg-gray-50 rounded-xl p-2.5 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all group"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                <img src={featuredProduct.image} alt={featuredProduct.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 group-hover:text-orange-600 line-clamp-2 leading-snug mb-1">{featuredProduct.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900">৳{featuredProduct.price.toLocaleString()}</span>
                  {featuredProduct.discount && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">-{featuredProduct.discount}%</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
export default function Header() {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageSearching, setImageSearching] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  useEffect(() => {
    const loadNotificationCount = async () => {
      const token = getToken('user');
      if (!token) { setNotificationCount(0); return; }
      try {
        const res = await api.get<{ count: number }>('/notifications/unread-count', token);
        setNotificationCount(Number(res.count || 0));
      } catch {
        setNotificationCount(0);
      }
    };
    const handleNotificationsRead = () => setNotificationCount(0);
    loadNotificationCount();
    window.addEventListener('customer-notifications-read', handleNotificationsRead);
    const timer = window.setInterval(loadNotificationCount, 15000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('customer-notifications-read', handleNotificationsRead);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  };

  const handleImageSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImageSearching(true);
      const data = await searchProductsByImage(file);
      sessionStorage.setItem('photoSearchResults', JSON.stringify(data));
      navigate('/search?photo=1');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo search failed. Please try again.';
      alert(message);
    } finally {
      setImageSearching(false);
    }
  };

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      {/* Promo bar */}
      <div className="bg-orange-500 text-white text-center text-xs py-1.5 px-4 hidden sm:block">
        Free delivery on orders over ৳2000 &nbsp;|&nbsp; Use code <strong>CARTUP10</strong> for 10% off!
      </div>

      {/* Main row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-3">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} className="text-gray-700" /> : <Menu size={22} className="text-gray-700" />}
          </button>

          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              Cart<span className="text-orange-500">up</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-2 sm:mx-4">
            <div className="flex items-center bg-gray-100 rounded-xl border border-gray-200 hover:border-orange-300 focus-within:border-orange-400 focus-within:bg-white transition-all duration-200">
              <Search size={18} className="ml-3 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands & categories..."
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none text-gray-700 placeholder-gray-400"
              />
              <label
                title="Search by photo"
                className="relative cursor-pointer text-gray-500 hover:text-orange-600 px-2 py-2 rounded-lg hover:bg-orange-50 transition-colors"
              >
                {imageSearching ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSearch}
                  className="sr-only"
                  disabled={imageSearching}
                />
              </label>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-r-xl transition-colors duration-150 hidden sm:block">
                Search
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/seller/login"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 hover:border-orange-400"
            >
              <Store size={16} />
              <span className="hidden lg:block">Sell on Cartup</span>
            </Link>
            <Link to="/notifications" className="relative hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Notifications">
              <Bell size={18} />
              <span className="hidden md:block font-medium">Notifications</span>
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>
            <Link to="/account" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
              <User size={18} />
              <span className="hidden md:block font-medium">Account</span>
            </Link>
            <Link to="/cart" className="relative flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
              <ShoppingCart size={20} />
              <span className="hidden md:block font-medium">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 pb-2 border-t border-gray-100 pt-2">
          <div ref={catRef} className="relative">
            <button
              onClick={() => setCatDropdownOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors mr-2 ${
                catDropdownOpen ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <Menu size={16} />
              All Categories
              <ChevronDown size={14} className={`transition-transform duration-200 ${catDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {catDropdownOpen && <MegaDropdown onClose={() => setCatDropdownOpen(false)} />}
          </div>

        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg max-h-[70vh] overflow-y-auto">
          <nav className="px-4 py-3 space-y-1">
            <Link to="/category/all" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
              <Grid3X3 size={15} />All Categories
            </Link>
            <hr className="border-gray-100 my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</p>
            {categories.map((cat) => {
              const subs = Object.keys(subSubMap[cat.slug] ?? {});
              return (
                <MobileCategoryRow
                  key={cat.id}
                  cat={cat}
                  subs={subs}
                  subSubMap={subSubMap[cat.slug] ?? {}}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              );
            })}
            <hr className="border-gray-100 my-2" />
            <Link to="/seller/login" className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
              <Store size={15} />Sell on Cartup
            </Link>
            <Link to="/notifications" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
              <Bell size={15} />Notifications
              {notificationCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-black rounded-full min-w-5 h-5 flex items-center justify-center px-1">{notificationCount > 99 ? '99+' : notificationCount}</span>}
            </Link>
            <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
              <User size={15} />My Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Mobile: 3-level expandable rows ──────────────────────────────────────────
function MobileCategoryRow({
  cat, subs, subSubMap, onNavigate,
}: {
  cat: { id: string; name: string; image: string; slug: string };
  subs: string[];
  subSubMap: Record<string, string[]>;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);

  return (
    <div>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
        </div>
        <span className="flex-1 text-left font-medium">{cat.name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 text-gray-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pl-11 pr-2 pb-1">
          <Link
            to={categoryUrl(cat.slug)}
            onClick={onNavigate}
            className="block text-xs font-semibold text-orange-500 hover:underline py-1 mb-1"
          >
            View All {cat.name}
          </Link>
          {subs.map((sub) => {
            const subItems = subSubMap[sub] ?? [];
            const subOpen = openSub === sub;
            return (
              <div key={sub}>
                <div className="flex items-center gap-1">
                  <Link
                    to={categoryUrl(cat.slug, sub)}
                    onClick={onNavigate}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-gray-600 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    {sub}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Show ${sub} subcategories`}
                    className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                    onClick={() => setOpenSub(subOpen ? null : sub)}
                  >
                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${subOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {subOpen && (
                  <div className="pl-3 pb-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {subItems.map((item) => (
                      <Link
                        key={item}
                        to={categoryUrl(cat.slug, sub, item)}
                        onClick={onNavigate}
                        className="text-[11px] text-gray-500 hover:text-orange-500 py-1 px-1.5 flex items-center gap-1 transition-colors"
                      >
                        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                        {item}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
