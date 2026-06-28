import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronRight, Clock, LayoutGrid } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductRail from '../components/ProductRail';
import { useProducts } from '../hooks/useProducts';
import { categoryKey, get99TkProducts, getBestSellingProducts, getNewArrivalProducts } from '../utils/productCollections';
import { getSaleDiscount, withSalePricing } from '../utils/salePricing';

function useCountdown(targetHours: number) {
  const getTimeLeft = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(targetHours, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const diff = target.getTime() - now.getTime();
    return {
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-900 text-white font-bold text-2xl sm:text-3xl w-14 sm:w-16 h-14 sm:h-16 rounded-xl flex items-center justify-center tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-red-200 text-xs font-medium mt-1.5 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function FlashSalePage() {
  const { hours, minutes, seconds } = useCountdown(23);
  const { products, loading } = useProducts();
  const [activeCat, setActiveCat] = useState('all');

  const saleProducts = useMemo(() => products
    .filter((p) => Array.isArray(p.saleTags) && p.saleTags.includes('flash'))
    .sort((a, b) => getSaleDiscount(b, 'flash') - getSaleDiscount(a, 'flash')), [products]);

  const categoryGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const p of saleProducts) {
      const key = categoryKey(p.category || 'other') || 'other';
      const label = p.category || 'Other';
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [saleProducts]);

  const filtered = activeCat === 'all'
    ? saleProducts
    : saleProducts.filter((p) => categoryKey(p.category) === activeCat);

  const newArrivals = getNewArrivalProducts(products, 12);
  const products99 = get99TkProducts(products, 12);
  const bestSelling = getBestSellingProducts(products, 12);

  const maxDiscount = saleProducts.length ? Math.max(...saleProducts.map((p) => getSaleDiscount(p, 'flash'))) : 0;
  const minDiscount = saleProducts.length ? Math.min(...saleProducts.map((p) => getSaleDiscount(p, 'flash'))) : 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="relative bg-gradient-to-r from-red-600 to-orange-500 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-40 h-40 bg-yellow-300 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="text-red-100 font-semibold text-sm uppercase tracking-widest">Limited Time Only</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Flash Sale</h1>
              <p className="text-red-100 text-base mb-4 max-w-md">
                Massive discounts up to {maxDiscount}% off, plus new arrivals, ৳99 products, and best sellers.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Link to="/" className="text-red-200 hover:text-white transition-colors">Home</Link>
                <ChevronRight size={14} className="text-red-300" />
                <span className="text-white font-medium">Flash Sale</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1.5 text-red-200 text-sm font-medium mb-3">
                <Clock size={14} />Ends in
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <TimeUnit value={hours} label="Hours" />
                <span className="text-white font-bold text-2xl mb-4">:</span>
                <TimeUnit value={minutes} label="Mins" />
                <span className="text-white font-bold text-2xl mb-4">:</span>
                <TimeUnit value={seconds} label="Secs" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Products on Sale', value: saleProducts.length },
            { label: 'Max Discount', value: `${maxDiscount}%` },
            { label: 'Min Discount', value: `${minDiscount}%` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-500">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Flash Sale Categories</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCat('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCat === 'all' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All ({saleProducts.length})
            </button>
            {categoryGroups.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCat(cat.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCat === cat.key ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">Loading flash sale products...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <LayoutGrid size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No flash sale products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={withSalePricing(product, 'flash')} />
            ))}
          </div>
        )}

        <ProductRail title="New Arrivals" subtitle="Admin-selected newest products" products={newArrivals} viewAllLink="/new-arrivals" />
        <ProductRail title="৳99 Products" subtitle="Products automatically shown here when price is ৳99" products={products99} />
        <ProductRail title="Best Selling Products" subtitle="Auto-detected from customer orders and sales history" products={bestSelling} />
      </div>
    </div>
  );
}
