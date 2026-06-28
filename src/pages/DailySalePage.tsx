import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flame, LayoutGrid, Tag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductRail from '../components/ProductRail';
import { useProducts } from '../hooks/useProducts';
import { categoryKey, get99TkProducts, getBestSellingProducts, getNewArrivalProducts } from '../utils/productCollections';
import { getSaleDiscount, withSalePricing } from '../utils/salePricing';
import { defaultPlatformSettings, fetchPublicPlatformSettings, getSaleBannerStyle, type PlatformSettings } from '../lib/platformSettings';

function discountOf(product: any) {
  return getSaleDiscount(product, 'daily');
}

function categoryLabel(value: string) {
  return value || 'Other';
}

export default function DailySalePage() {
  const { products, loading } = useProducts();
  const [activeCat, setActiveCat] = useState('all');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(defaultPlatformSettings);

  useEffect(() => {
    fetchPublicPlatformSettings().then(setPlatformSettings).catch(() => {});
  }, []);

  const dailyProducts = useMemo(() => products
    .filter((p) => Array.isArray(p.saleTags) && p.saleTags.includes('daily'))
    .sort((a, b) => discountOf(b) - discountOf(a)), [products]);

  const categoryGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const p of dailyProducts) {
      const key = categoryKey(p.category || 'other') || 'other';
      const label = categoryLabel(p.category || 'Other');
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [dailyProducts]);

  const filteredDailyProducts = activeCat === 'all'
    ? dailyProducts
    : dailyProducts.filter((p) => categoryKey(p.category) === activeCat);

  const newArrivals = getNewArrivalProducts(products, 12);
  const products99 = get99TkProducts(products, 12);
  const bestSelling = getBestSellingProducts(products, 12);
  const filterByActiveCategory = (list: any[]) => activeCat === 'all' ? list : list.filter((p) => categoryKey(p.category) === activeCat);
  const filteredNewArrivals = filterByActiveCategory(newArrivals);
  const filtered99Products = filterByActiveCategory(products99);
  const filteredBestSelling = filterByActiveCategory(bestSelling);
  const activeCategoryLabel = activeCat === 'all' ? 'All Categories' : (categoryGroups.find((cat) => cat.key === activeCat)?.label || 'Selected Category');

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="relative overflow-hidden" style={getSaleBannerStyle(platformSettings.dailySaleBanner)}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-40 h-40 bg-yellow-300 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Flame size={22} className="text-white" />
            </div>
            <span className="text-orange-100 font-semibold text-sm uppercase tracking-widest">Admin Selected Deals</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Daily Sale</h1>
          <p className="text-orange-100 max-w-xl">Today&apos;s selected deals, category offers, new arrivals, ৳99 products, and best sellers.</p>
          <div className="flex items-center gap-2 text-sm mt-4">
            <Link to="/" className="text-orange-100 hover:text-white">Home</Link>
            <ChevronRight size={14} className="text-orange-100" />
            <span className="text-white font-semibold">Daily Sale</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-900">Daily Sale by Category</h2>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Tag size={12} /> {filteredDailyProducts.length}</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            <button onClick={() => setActiveCat('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${activeCat === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>All ({dailyProducts.length})</button>
            {categoryGroups.map((cat) => (
              <button key={cat.key} onClick={() => setActiveCat(cat.key)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${activeCat === cat.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{cat.label} ({cat.count})</button>
            ))}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">Loading daily sale products...</div>
          ) : filteredDailyProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">
              <LayoutGrid className="mx-auto mb-3 text-gray-300" size={36} />
              No daily sale products selected for this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredDailyProducts.map((product) => <ProductCard key={product.id} product={withSalePricing(product, 'daily')} />)}
            </div>
          )}
        </div>

        <ProductRail title={`New Arrivals · ${activeCategoryLabel}`} subtitle="Admin-selected newest products filtered by the selected category" products={filteredNewArrivals} viewAllLink="/new-arrivals" />
        <ProductRail title={`৳99 Products · ${activeCategoryLabel}`} subtitle="Products priced at ৳99 filtered by the selected category" products={filtered99Products} />
        <ProductRail title={`Best Selling Products · ${activeCategoryLabel}`} subtitle="Auto-detected best sellers filtered by the selected category" products={filteredBestSelling} />
      </div>
    </div>
  );
}
