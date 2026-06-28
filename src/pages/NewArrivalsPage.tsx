import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight, LayoutGrid } from 'lucide-react';
import { categories } from '../data/categories';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { categoryKey, getNewArrivalProducts } from '../utils/productCollections';

export default function NewArrivalsPage() {
  const { products, loading } = useProducts();
  const newProducts = getNewArrivalProducts(products, 500);
  const [activeCat, setActiveCat] = useState('all');

  // Only show categories that have at least 1 new-badge product
  const presentCats = categories.filter((c) =>
    newProducts.some((p) => categoryKey(p.category) === categoryKey(c.slug) || categoryKey(p.category) === categoryKey(c.name))
  );

  const filtered = activeCat === 'all'
    ? newProducts
    : newProducts.filter((p) => categoryKey(p.category) === categoryKey(activeCat) || categoryKey(p.category) === categoryKey(categories.find((c) => c.slug === activeCat)?.name));

  const countForCat = (slug: string) =>
    newProducts.filter((p) => categoryKey(p.category) === categoryKey(slug) || categoryKey(p.category) === categoryKey(categories.find((c) => c.slug === slug)?.name)).length;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-500 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-48 h-48 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="text-emerald-100 font-semibold text-sm uppercase tracking-widest">Just Arrived</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">New Arrivals</h1>
          <p className="text-emerald-100 text-base mb-5 max-w-md">
            Be the first to shop the latest products freshly added to our store.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-emerald-200 hover:text-white transition-colors">Home</Link>
            <ChevronRight size={14} className="text-emerald-300" />
            <span className="text-white font-medium">New Arrivals</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category filter row */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter by Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* All chip */}
            <button
              onClick={() => setActiveCat('all')}
              className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                activeCat === 'all'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600'
              }`}
            >
              <LayoutGrid size={15} />
              All
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeCat === 'all' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {newProducts.length}
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
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 border ${active ? 'border-white/30' : 'border-gray-200'}`}>
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="whitespace-nowrap">{cat.name}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-600'
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
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-900">
              {activeCat === 'all'
                ? 'All New Arrivals'
                : (presentCats.find((c) => c.slug === activeCat)?.name ?? 'New Arrivals')}
            </h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {filtered.length} items
            </span>
          </div>
          {activeCat !== 'all' && (
            <button
              onClick={() => setActiveCat('all')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Sparkles size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No new arrivals in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* You might also like */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-900">You Might Also Like</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.filter((p) => p.badge === 'hot').slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
