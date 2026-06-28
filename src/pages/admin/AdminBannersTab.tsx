import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import ImageUploader from '../../components/forms/ImageUploader';

type ProductOption = { id: string; name: string; image?: string; brand?: string; category?: string; price?: number };
type PromoOption = { id: string; code: string; description?: string; image?: string };
type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  placement?: 'hero' | 'header';
  bannerType?: 'generic' | 'event' | 'voucher' | 'campaign';
  categories?: string[];
  brands?: string[];
  products?: ProductOption[];
  promo?: PromoOption | null;
  sortOrder?: number;
  active?: boolean;
};

const emptyForm = {
  image: '',
  title: '',
  subtitle: '',
  link: '',
  placement: 'hero' as 'hero' | 'header',
  bannerType: 'generic' as 'generic' | 'event' | 'voucher' | 'campaign',
  categoriesText: '',
  brandsText: '',
  products: [] as string[],
  promo: '',
  sortOrder: '0',
  active: true,
};

const splitList = (value: string) => value.split(',').map((x) => x.trim()).filter(Boolean);
const typeLabel = (type?: string) => type ? type.replace(/_/g, ' ') : 'generic';

export default function AdminBannersTab() {
  const token = getToken('admin');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [promos, setPromos] = useState<PromoOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [bannerRes, productRes, promoRes] = await Promise.all([
      api.get<{ banners: Banner[] }>('/admin/banners', token),
      api.get<{ products: ProductOption[] }>('/products?includeInactive=true', token),
      api.get<{ promos: PromoOption[] }>('/admin/promos', token).catch(() => ({ promos: [] as PromoOption[] })),
    ]);
    setBanners(bannerRes.banners || []);
    setProducts(productRes.products || []);
    setPromos(promoRes.promos || []);
  };

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load banners')); }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const list = q ? products.filter((p) => [p.name, p.brand, p.category].filter(Boolean).join(' ').toLowerCase().includes(q)) : products;
    return list.slice(0, 80);
  }, [products, productSearch]);

  const toggleProduct = (id: string) => {
    setForm((prev) => ({ ...prev, products: prev.products.includes(id) ? prev.products.filter((x) => x !== id) : [...prev.products, id] }));
  };

  const save = async () => {
    setLoading(true); setError(''); setMsg('');
    try {
      const payload = {
        image: form.image,
        title: form.title,
        subtitle: form.subtitle,
        link: form.link || '',
        placement: form.placement,
        bannerType: form.bannerType,
        categories: splitList(form.categoriesText),
        brands: splitList(form.brandsText),
        products: form.products,
        promo: form.promo || null,
        sortOrder: Number(form.sortOrder || 0),
        active: form.active,
      };
      if (payload.placement === 'header' && !payload.link && !payload.products.length && !payload.categories.length && !payload.brands.length && !payload.promo) {
        // Header event/campaign cards should open a related-products page. If admin did not select rules, the backend page still opens and shows fallback latest products.
        payload.link = '';
      }
      await api.post('/admin/banners', payload, token);
      setForm(emptyForm);
      setProductSearch('');
      setMsg('Display photo saved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save display photo');
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this display photo?')) return;
    await api.delete(`/admin/banners/${id}`, token);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-xl font-black flex items-center gap-2"><ImageIcon /> Hero, Header Events & Campaign Photos</h2>
        <p className="text-sm text-gray-500 mt-1">Upload homepage hero photos, larger header event/campaign photos, and connect each header photo to related products.</p>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {msg && <p className="mt-3 text-sm font-semibold text-green-600">{msg}</p>}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Display location</span>
            <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as 'hero' | 'header' })}>
              <option value="hero">Homepage hero photo box</option>
              <option value="header">Header upper orange promo box</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Photo type</span>
            <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.bannerType} onChange={(e) => setForm({ ...form, bannerType: e.target.value as any })}>
              <option value="generic">Generic</option>
              <option value="event">Event photo</option>
              <option value="voucher">Voucher photo</option>
              <option value="campaign">Campaign photo</option>
            </select>
          </label>
          <input className="border rounded-xl p-3 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm" placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm md:col-span-2" placeholder="Optional custom link, example: /daily-sale. Leave empty to open related products page." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm" placeholder="Related categories, comma separated" value={form.categoriesText} onChange={(e) => setForm({ ...form, categoriesText: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm" placeholder="Related brands, comma separated" value={form.brandsText} onChange={(e) => setForm({ ...form, brandsText: e.target.value })} />
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Voucher/coupon relation optional</span>
            <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.promo} onChange={(e) => setForm({ ...form, promo: e.target.value })}>
              <option value="">No voucher/coupon relation</option>
              {promos.map((p) => <option key={p.id} value={p.id}>{p.code} {p.description ? `— ${p.description}` : ''}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Sort order</span>
            <input className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <ImageUploader label="Display photo" helperText="Upload hero/header event/voucher/campaign photo" value={form.image} onChange={(url) => setForm({ ...form, image: url })} token={token} />
        </div>

        {form.placement === 'header' && (
          <div className="mt-4 bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-black text-gray-900">Select related products together</p>
                <p className="text-xs text-gray-500">When customers click this header photo, these products will show on the event/campaign/voucher products page.</p>
              </div>
              <span className="text-xs font-black text-orange-600">{form.products.length} selected</span>
            </div>
            <input className="mt-3 w-full border rounded-xl p-3 text-sm" placeholder="Search product name, brand, category..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            <div className="mt-3 max-h-64 overflow-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredProducts.map((p) => (
                <button key={p.id} type="button" onClick={() => toggleProduct(p.id)} className={`text-left border rounded-xl p-2 flex gap-2 items-center ${form.products.includes(p.id) ? 'border-orange-400 bg-white ring-2 ring-orange-100' : 'bg-white hover:border-orange-200'}`}>
                  {p.image && <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{p.brand || p.category || 'Product'} • ৳{Number(p.price || 0).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={save} disabled={loading} className="mt-4 bg-blue-600 disabled:bg-blue-300 text-white rounded-xl px-5 py-2.5 font-bold flex items-center gap-2"><Plus size={16}/>{loading ? 'Saving...' : 'Add display photo'}</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-2xl border overflow-hidden">
            <img src={banner.image} alt={banner.title || 'Display'} className="w-full h-40 object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase font-black text-orange-600">{banner.placement === 'header' ? 'Header upper promo' : 'Hero photo'} • {typeLabel(banner.bannerType)}</p>
                  <h3 className="font-black text-gray-900">{banner.title || 'Untitled display photo'}</h3>
                  <p className="text-sm text-gray-500">{banner.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{banner.active === false ? 'Inactive' : 'Active'} • Sort {banner.sortOrder || 0}</p>
                  {banner.placement === 'header' && <p className="text-xs text-gray-500 mt-1">Related products: {banner.products?.length || 0}</p>}
                </div>
                <button onClick={() => remove(banner.id)} className="text-red-500 hover:text-red-600"><Trash2 size={17}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
