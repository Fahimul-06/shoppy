import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Package, ShoppingBag, Star, Store } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { fetchSellerShop } from '../lib/db';
import type { Product } from '../types';

function normalize(value: string) {
  return String(value || '').trim().toLowerCase();
}

export default function SellerShopPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'all';
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!id) return;
    setLoading(true);
    setError('');
    fetchSellerShop(id)
      .then((data) => {
        if (!alive) return;
        setSeller(data.seller);
        setProducts(data.products || []);
        setCategories(data.categories || []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Seller shop could not be loaded');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((product) => normalize(product.category) === normalize(selectedCategory));
  }, [products, selectedCategory]);

  const openCategory = (category: string) => {
    const next = new URLSearchParams(searchParams);
    if (category === 'all') next.delete('category');
    else next.set('category', category);
    setSearchParams(next);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading seller shop...</div>;

  if (error || !seller) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <Store className="text-gray-300 mb-3" size={44} />
        <p className="text-gray-600 font-bold mb-3">{error || 'Seller shop not found'}</p>
        <Link to="/" className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold">Back to Home</Link>
      </div>
    );
  }

  const banner = seller.shopBanner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80';
  const logo = seller.shopLogo || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="h-44 sm:h-56 lg:h-64 bg-gray-200">
            <img src={banner} alt={seller.shopName || 'Shop banner'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>

          <div className="absolute left-5 right-5 bottom-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 text-white">
            <div className="flex items-end gap-4 min-w-0">
              {logo ? (
                <img src={logo} alt={seller.shopName || 'Shop logo'} className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-white bg-white shadow-lg" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white bg-orange-500 flex items-center justify-center shadow-lg">
                  <Store size={36} />
                </div>
              )}
              <div className="min-w-0 pb-1">
                <p className="text-xs font-black uppercase tracking-wide text-orange-100">Official Shop</p>
                <h1 className="text-2xl sm:text-4xl font-black truncate">{seller.shopName || seller.name || 'Seller Shop'}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90 mt-1">
                  {seller.name && <span>Seller: {seller.name}</span>}
                  {seller.shopAddress && <span className="flex items-center gap-1"><MapPin size={14} /> {seller.shopAddress}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[280px]">
              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
                <div className="flex justify-center text-orange-200"><Star size={18} className="fill-orange-200" /></div>
                <p className="font-black text-lg">{Number(seller.rating || 0).toFixed(1)}</p>
                <p className="text-[11px] text-white/80">Rating</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
                <div className="flex justify-center text-orange-200"><Package size={18} /></div>
                <p className="font-black text-lg">{seller.productCount || products.length}</p>
                <p className="text-[11px] text-white/80">Products</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
                <div className="flex justify-center text-orange-200"><ShoppingBag size={18} /></div>
                <p className="font-black text-lg">{seller.soldCount || 0}</p>
                <p className="text-[11px] text-white/80">Sold</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-white rounded-3xl border border-gray-100 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Shop Products</h2>
              <p className="text-sm text-gray-500">Browse products from this seller category wise.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => openCategory('all')} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border ${selectedCategory === 'all' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50'}`}>All</button>
              {categories.map((category) => (
                <button key={category} onClick={() => openCategory(category)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border ${normalize(selectedCategory) === normalize(category) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50'}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-14 text-center text-gray-500">No products found in this category.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredProducts.map((product) => <ProductCard key={product.id || (product as any)._id} product={product} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
