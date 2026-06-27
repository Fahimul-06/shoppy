import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, TicketPercent, Loader2, CalendarClock, Store, Tags, ShoppingCart } from 'lucide-react';
import { api } from '../lib/api';

type Promo = {
  id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  usedCount?: number;
  appliesTo?: string;
  categories?: string[];
  subcategories?: string[];
  childCategories?: string[];
  brands?: string[];
  sellers?: Array<{ id?: string; name?: string; shopName?: string }>;
  products?: Array<{ id?: string; name?: string }>;
  expiresAt?: string;
  active?: boolean;
};

const discountText = (promo: Promo) => promo.discountType === 'percentage'
  ? `${Number(promo.discountValue || 0)}% OFF`
  : `৳${Number(promo.discountValue || 0).toLocaleString()} OFF`;


const couponUsePath = (promo: Promo) => {
  const firstProduct = promo.products?.[0]?.id;
  if (firstProduct) return `/product/${firstProduct}`;
  const firstCategory = promo.categories?.[0];
  if (firstCategory) return `/category/${encodeURIComponent(firstCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}`;
  return '/cart';
};

const targetText = (promo: Promo) => {
  const parts: string[] = [];
  if (!promo.appliesTo || promo.appliesTo === 'all') return 'Usable on all eligible products';
  if (promo.categories?.length) parts.push(`Category: ${promo.categories.join(', ')}`);
  if (promo.subcategories?.length) parts.push(`Subcategory: ${promo.subcategories.join(', ')}`);
  if (promo.childCategories?.length) parts.push(`Child category: ${promo.childCategories.join(', ')}`);
  if (promo.brands?.length) parts.push(`Brand: ${promo.brands.join(', ')}`);
  if (promo.sellers?.length) parts.push(`Seller: ${promo.sellers.map((s) => s.shopName || s.name || 'Seller').join(', ')}`);
  if (promo.products?.length) parts.push(`Products: ${promo.products.map((p) => p.name || 'Product').join(', ')}`);
  return parts.join(' • ') || 'Usable on selected products';
};

export default function CouponsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPromos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ promos?: Promo[]; coupons?: Promo[]; vouchers?: Promo[] } | Promo[]>('/promos');
      const list = Array.isArray(res)
        ? res
        : (Array.isArray(res.promos) ? res.promos : (Array.isArray(res.coupons) ? res.coupons : (Array.isArray(res.vouchers) ? res.vouchers : [])));
      setPromos(list);
    } catch (e) {
      setPromos([]);
      setError(e instanceof Error ? e.message : 'Could not load vouchers and coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPromos(); }, []);

  const visiblePromos = useMemo(() => promos.filter((p) => p && p.active !== false && p.code), [promos]);
  const copy = async (code: string) => {
    try { await navigator.clipboard?.writeText(code); } catch { /* ignore clipboard failure */ }
    setCopied(code);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4">
        <ArrowLeft size={14}/> Back to profile
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><TicketPercent/> Vouchers & Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Copy a voucher code and apply it during checkout.</p>
        </div>
        <button onClick={loadPromos} className="text-sm font-bold text-orange-600 hover:text-orange-700">Refresh</button>
      </div>

      {loading ? (
        <div className="bg-white border rounded-2xl p-8 text-center text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={18}/> Loading coupons...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600">
          <p className="font-bold">Could not load coupons.</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : visiblePromos.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">
          No active vouchers or coupons right now.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visiblePromos.map((promo) => (
            <div key={promo.id || promo.code} className="relative overflow-hidden bg-white border rounded-2xl p-5 shadow-sm">
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-orange-50" />
              <div className="relative flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1 text-xs font-black text-orange-600 bg-orange-50 rounded-full px-2 py-1 mb-2">
                    <TicketPercent size={13}/> {discountText(promo)}
                  </p>
                  <p className="text-xs text-gray-500">Coupon code</p>
                  <p className="text-2xl font-black tracking-wider text-gray-900 break-all">{promo.code}</p>
                  <p className="text-sm text-gray-600 mt-1">{promo.description || discountText(promo)}</p>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p className="flex items-start gap-1.5"><Tags size={13} className="mt-0.5"/> {targetText(promo)}</p>
                    <p>Minimum order: ৳{Number(promo.minOrderAmount || 0).toLocaleString()}</p>
                    {promo.maxDiscountAmount ? <p>Maximum discount: ৳{Number(promo.maxDiscountAmount).toLocaleString()}</p> : null}
                    {promo.expiresAt ? <p className="flex items-center gap-1.5"><CalendarClock size={13}/> Expires: {new Date(promo.expiresAt).toLocaleString()}</p> : null}
                    {promo.sellers?.length ? <p className="flex items-center gap-1.5"><Store size={13}/> Seller voucher</p> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => copy(promo.code)}
                    className="h-fit px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                  >
                    <Copy size={15}/>{copied === promo.code ? 'Copied' : 'Copy'}
                  </button>
                  <Link
                    to={couponUsePath(promo)}
                    onClick={() => copy(promo.code)}
                    className="h-fit px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                  >
                    <ShoppingCart size={15}/> Use Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
