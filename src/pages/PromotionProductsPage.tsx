import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
import { api } from '../lib/api';

type PromoBanner = {
  id: string;
  image?: string;
  title?: string;
  subtitle?: string;
  bannerType?: string;
  promo?: { code?: string; discountType?: string; discountValue?: number };
};

export default function PromotionProductsPage() {
  const { kind = 'banner', id = '' } = useParams();
  const [banner, setBanner] = useState<PromoBanner | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<{ banner: PromoBanner; products: Product[] }>(`/hero-slides/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/products`)
      .then((res) => {
        setBanner(res.banner || null);
        setProducts(res.products || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load related products.'))
      .finally(() => setLoading(false));
  }, [kind, id]);

  const title = useMemo(() => {
    if (banner?.title) return banner.title;
    if (banner?.bannerType === 'voucher') return 'Voucher Related Products';
    if (banner?.bannerType === 'campaign') return 'Campaign Related Products';
    if (banner?.bannerType === 'event') return 'Event Related Products';
    return 'Related Products';
  }, [banner]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-orange-600 mb-4">
        <ArrowLeft size={15}/> Back to home
      </Link>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 min-h-[180px] sm:min-h-[240px] p-6 sm:p-10 text-white mb-6">
        {banner?.image && <img src={banner.image} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-35" />}
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wide mb-3">
            <Sparkles size={14}/> {banner?.bannerType || 'promotion'}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight">{title}</h1>
          {banner?.subtitle && <p className="mt-2 text-white/90">{banner.subtitle}</p>}
          {banner?.promo?.code && <p className="mt-4 inline-flex rounded-xl bg-white text-orange-600 px-4 py-2 font-black">Code: {banner.promo.code}</p>}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Loading products...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 font-semibold">{error}</div>
      ) : products.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">No related products found for this promotion yet.</div>
      ) : (
        <div>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Related Products</h2>
              <p className="text-sm text-gray-500">{products.length} product{products.length === 1 ? '' : 's'} found</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      )}
    </div>
  );
}
