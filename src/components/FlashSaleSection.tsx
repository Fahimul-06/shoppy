import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Clock, ChevronRight, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { getDisplayOriginalPrice, getSaleDiscount, getSalePrice, withSalePricing } from '../utils/salePricing';
import { defaultPlatformSettings, fetchPublicPlatformSettings, getCurrentFlashSaleSlot, getSaleBannerStyle, type PlatformSettings } from '../lib/platformSettings';

function useCountdown(targetDate?: string | null) {
  const getTimeLeft = () => {
    const now = new Date();
    let target = targetDate ? new Date(targetDate) : new Date();
    if (!targetDate || Number.isNaN(target.getTime())) {
      target = new Date();
      target.setHours(23, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
    }
    if (target <= now) return { h: 0, m: 0, s: 0, ended: true };
    const diff = target.getTime() - now.getTime();
    return {
      h: Math.floor(diff / (1000 * 60 * 60)),
      m: Math.floor((diff / (1000 * 60)) % 60),
      s: Math.floor((diff / 1000) % 60),
      ended: false,
    };
  };
  const [t, setT] = useState(getTimeLeft);
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return t;
}

function TimeUnit({ v, label }: { v: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-900/80 text-white text-sm sm:text-base font-bold w-9 sm:w-10 h-9 sm:h-10 rounded-lg flex items-center justify-center tabular-nums backdrop-blur-sm">
        {String(v).padStart(2, '0')}
      </div>
      <span className="text-red-200 text-[9px] font-semibold mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function FlashSaleSection() {
  const { addItem } = useCart();
  const { products, loading } = useProducts();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(defaultPlatformSettings);
  const currentFlashSlot = getCurrentFlashSaleSlot(platformSettings);

  useEffect(() => {
    fetchPublicPlatformSettings().then(setPlatformSettings).catch(() => {});
  }, []);
  const saleProducts = products
    .filter((p) => Array.isArray(p.saleTags) && p.saleTags.includes('flash'))
    .sort((a, b) => getSaleDiscount(b, 'flash') - getSaleDiscount(a, 'flash'))
    .slice(0, 8);
  const { h, m, s, ended } = useCountdown(currentFlashSlot?.endsAt || platformSettings.flashSaleEndsAt);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Section header */}
      <div className="relative rounded-2xl overflow-hidden mb-4" style={getSaleBannerStyle(platformSettings.flashSaleBanner)}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-1/3 w-48 h-48 bg-yellow-300 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 left-1/4 w-56 h-56 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 gap-4 flex-wrap">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <Zap size={20} className="text-white" fill="white" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-xl sm:text-2xl leading-tight">Flash Sale</h2>
              <p className="text-red-100 text-xs font-medium hidden sm:block">Huge discounts — limited time only</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-red-100 text-xs font-semibold mr-1">
              <Clock size={13} /> {ended ? 'Ended' : currentFlashSlot?.title ? `${currentFlashSlot.title} ends in` : 'Ends in'}
            </div>
            <TimeUnit v={h} label="Hrs" />
            <span className="text-white font-bold text-lg mb-4">:</span>
            <TimeUnit v={m} label="Min" />
            <span className="text-white font-bold text-lg mb-4">:</span>
            <TimeUnit v={s} label="Sec" />
          </div>

          {/* Desktop CTA */}
          <Link
            to="/flash-sale"
            className="hidden sm:flex items-center gap-1.5 bg-white text-red-500 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            View All Deals <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      {/* Products — horizontal scroll on mobile, wrap on larger screens */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 sm:overflow-visible sm:pb-0">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 w-full">Loading sale products...</div>
        ) : saleProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 w-full">No flash sale products selected yet.</div>
        ) : saleProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all duration-200 group flex-shrink-0 w-40 sm:w-auto flex flex-col overflow-hidden"
          >
            <Link
              to={`/product/${product.id}`}
              className="relative overflow-hidden bg-gray-50 block"
              style={{ paddingTop: '90%' }}
            >
              <img
                src={product.image}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {getSaleDiscount(product, 'flash') > 0 && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-red-600/90 to-transparent py-1.5 flex items-center justify-center">
                  <span className="text-white font-extrabold text-sm">-{getSaleDiscount(product, 'flash')}%</span>
                </div>
              )}
            </Link>

            <div className="p-2.5 flex flex-col flex-1">
              <Link to={`/product/${product.id}`}>
                <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-snug hover:text-red-500 transition-colors mb-1.5">
                  {product.name}
                </p>
              </Link>

              <div className="flex items-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={i < Math.floor(product.rating ?? 0) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}
                  />
                ))}
              </div>

              <div className="mb-2.5">
                <span className="text-sm font-bold text-gray-900 block">৳{Number(getSalePrice(product, 'flash') ?? 0).toLocaleString()}</span>
                {getDisplayOriginalPrice(product, 'flash') && (
                  <span className="text-xs text-gray-400 line-through">৳{Number(getDisplayOriginalPrice(product, 'flash')).toLocaleString()}</span>
                )}
              </div>

              <button
                onClick={() => addItem(withSalePricing(product, 'flash'))}
                className="mt-auto w-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-200 hover:border-red-500 text-xs font-semibold py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95"
              >
                <ShoppingCart size={12} />
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile full-width CTA */}
      <div className="mt-4 sm:hidden">
        <Link
          to="/flash-sale"
          className="flex items-center justify-center gap-2 w-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-3 rounded-xl transition-colors active:scale-95"
        >
          <Zap size={15} fill="white" />
          View All Flash Deals
          <ChevronRight size={15} />
        </Link>
      </div>
    </section>
  );
}
