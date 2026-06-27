import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flame, LayoutGrid, Tag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { categories } from '../data/categories';
import { getSaleDiscount, withSalePricing } from '../utils/salePricing';

function discountOf(product: any) {
  return getSaleDiscount(product, 'daily');
}

export default function DailySalePage() {
  const { products, loading } = useProducts();
  const dailyProducts = useMemo(() => products
    .filter((p) => Array.isArray(p.saleTags) && p.saleTags.includes('daily'))
    .sort((a, b) => discountOf(b) - discountOf(a)), [products]);

  const presentCats = categories.filter((cat) => dailyProducts.some((p) => p.category === cat.slug || String(p.category || '').toLowerCase() === cat.name.toLowerCase()));
  const maxDiscount = dailyProducts.length ? Math.max(...dailyProducts.map(discountOf)) : 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-orange-500 via-orange-500 to-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Flame size={22} className="text-white" />
            </div>
            <span className="text-orange-100 font-semibold text-sm uppercase tracking-widest">Admin Selected Deals</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Daily Sale</h1>
          <p className="text-orange-100 max-w-xl">Today&apos;s selected deals and special offers.</p>
          <div className="flex items-center gap-2 text-sm mt-4">
            <Link to="/" className="text-orange-100 hover:text-white">Home</Link>
            <ChevronRight size={14} className="text-orange-100" />
            <span className="text-white font-semibold">Daily Sale</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-orange-600">{dailyProducts.length}</p>
            <p className="text-xs text-gray-500 mt-1">Daily sale products</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-red-500">{maxDiscount}%</p>
            <p className="text-xs text-gray-500 mt-1">Max discount</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm col-span-2 sm:col-span-1">
            <p className="text-2xl font-black text-gray-900">{presentCats.length}</p>
            <p className="text-xs text-gray-500 mt-1">Categories</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-orange-500 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">All Daily Sale Products</h2>
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Tag size={12} /> {dailyProducts.length}</span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">Loading daily sale products...</div>
        ) : dailyProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">
            <LayoutGrid className="mx-auto mb-3 text-gray-300" size={36} />
            No daily sale products selected yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {dailyProducts.map((product) => <ProductCard key={product.id} product={withSalePricing(product, 'daily')} />)}
          </div>
        )}
      </div>
    </div>
  );
}
