import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  placement?: string;
  targetType?: string;
  targetValue?: string;
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
    api.get<{ banner?: Banner; heroSlide?: Banner; products?: Product[] }>(`/hero-slides/${encodeURIComponent(id)}`)
      .then((res) => {
        setBanner(res.banner || res.heroSlide || null);
        setProducts(res.products || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load related products'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-orange-600 mb-4">
          <ArrowLeft size={16} /> Back to home
        </Link>

        {banner && (
          <div className="relative overflow-hidden rounded-3xl bg-gray-200 h-44 sm:h-56 mb-6 shadow-sm">
            <img src={banner.image} alt={banner.title || 'Shoppy display'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex items-center px-6 sm:px-10">
              <div className="max-w-xl">
                <p className="text-xs font-black uppercase tracking-widest text-orange-200">{banner.placement || 'Campaign'}</p>
                <h1 className="mt-1 text-2xl sm:text-4xl font-black text-white">{banner.title || 'Related Products'}</h1>
                {banner.subtitle && <p className="mt-2 text-sm sm:text-base text-white/90">{banner.subtitle}</p>}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-gray-900">Related Products</h2>
          <p className="text-sm font-semibold text-gray-500">{products.length} item(s)</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border p-10 text-center text-gray-500">Loading products...</div>
        ) : error ? (
          <div className="bg-white rounded-2xl border p-10 text-center text-red-600 font-semibold">{error}</div>
        ) : products.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-10 text-center text-gray-500">No related products found yet.</div>
        )}
      </div>
    </div>
  );
}
