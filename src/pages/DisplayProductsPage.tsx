import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Megaphone, TicketPercent, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  placement?: 'event' | 'voucher' | 'campaign' | 'hero' | 'header';
};

const iconFor = (placement?: string) => {
  if (placement === 'voucher') return <TicketPercent size={22} />;
  if (placement === 'campaign') return <Sparkles size={22} />;
  return <Megaphone size={22} />;
};

const labelFor = (placement?: string) => {
  if (placement === 'voucher') return 'Voucher Related Products';
  if (placement === 'campaign') return 'Campaign Related Products';
  if (placement === 'event') return 'Event Related Products';
  return 'Related Products';
};

export default function DisplayProductsPage() {
  const { id } = useParams();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.get<{ banner: Banner; products: Product[] }>(`/hero-slides/${encodeURIComponent(id)}/products`)
      .then((res) => {
        setBanner(res.banner || null);
        setProducts(res.products || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load related products.'))
      .finally(() => setLoading(false));
  }, [id]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  useEffect(() => { setSelectedCategory('All'); }, [id]);

  const visibleProducts = selectedCategory === 'All'
    ? products
    : products.filter((product) => product.category === selectedCategory);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Loading products...</div>;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back home</Link>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 font-semibold">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1"><ArrowLeft size={14}/> Back home</Link>

      {banner && (
        <div className="relative overflow-hidden rounded-3xl bg-gray-100 min-h-[180px] border shadow-sm">
          <img src={banner.image} alt={banner.title || labelFor(banner.placement)} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
          <div className="relative z-10 p-6 sm:p-8 text-white max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/90 text-orange-600 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide mb-3">
              {iconFor(banner.placement)} {labelFor(banner.placement)}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black leading-tight">{banner.title || labelFor(banner.placement)}</h1>
            {banner.subtitle && <p className="text-white/90 mt-2 text-sm sm:text-base">{banner.subtitle}</p>}
          </div>
        </div>
      )}

      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === category ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 hover:border-orange-300'}`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {visibleProducts.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">No related products found for this display.</div>
      )}
    </div>
  );
}
