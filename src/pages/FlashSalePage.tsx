import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronRight, Clock, LayoutGrid } from 'lucide-react';
import { categories } from '../data/categories';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

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
  const saleProducts = products
    .filter((p) => Array.isArray(p.saleTags) && p.saleTags.includes('flash'))
    .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));

  const [activeCat, setActiveCat] = useState('all');

  // Only show categories that have at least 1 sale product
  const presentCats = categories.filter((c) =>
    saleProducts.some((p) => p.category === c.slug)
  );

  const filtered = activeCat === 'all'
    ? saleProducts
    : saleProducts.filter((p) => p.category === activeCat);

  const countForCat = (slug: string) =>
    saleProducts.filter((p) => p.category === slug).length;

  const maxDiscount = saleProducts.length ? Math.max(...saleProducts.map((p) => p.discount ?? 0)) : 0;
  const minDiscount = saleProducts.length ? Math.min(...saleProducts.map((p) => p.discount ?? 0)) : 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
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
                Massive discounts up to {maxDiscount}% off on top products. Don't miss out!
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Link to="/" className="text-red-200 hover:text-white transition-colors">Home</Link>
                <ChevronRight size={14} className="text-red-300" />
                <span className="text-white font-medium">Flash Sale</span>
              </div>
            </div>
            {/* Countdown */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Category filter row */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter by Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* All chip */}
            <button
              onClick={() => setActiveCat('all')}
              className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                activeCat === 'all'
                  ? 'bg-red-500 border-red-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <LayoutGrid size={15} />
              All
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeCat === 'all' ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {saleProducts.length}
              </span>
            </button>

            {/* Category chips */}
            {presentCats.map((cat) => {
              const count = countForCat(cat.slug);
              const active = activeCat === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(active ? 'all' : cat.slug)}
                  className={`flex items-center gap-2.5 flex-shrink-0 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    active
                      ? 'bg-red-500 border-red-500 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 border ${active ? 'border-white/30' : 'border-gray-200'}`}>
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="whitespace-nowrap">{cat.name}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-900">
              {activeCat === 'all'
                ? 'All Sale Products'
                : (presentCats.find((c) => c.slug === activeCat)?.name ?? 'Sale Products')}
            </h2>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {filtered.length} deals
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeCat !== 'all' && (
              <button
                onClick={() => setActiveCat('all')}
                className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
              >
                Clear filter
              </button>
            )}
            <span className="text-sm text-gray-500 hidden sm:block">Sorted by highest discount</span>
          </div>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">No flash sale products selected yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Also check out */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-900">Also Check Out</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.filter((p) => p.badge === 'hot').map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
