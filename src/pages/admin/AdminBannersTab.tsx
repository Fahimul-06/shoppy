import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import ImageUploader from '../../components/forms/ImageUploader';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  placement?: 'hero' | 'header' | 'event' | 'voucher' | 'campaign';
  targetType?: 'all' | 'category' | 'brand' | 'seller' | 'products' | 'customLink';
  targetValue?: string;
  productIds?: string[];
  sortOrder?: number;
  active?: boolean;
};

type ProductOption = { id: string; name: string; brand?: string; category?: string; image?: string; price?: number; seller?: any };
type SellerOption = { id: string; name?: string; shopName?: string; email?: string };

const emptyForm = {
  image: '',
  title: '',
  subtitle: '',
  link: '',
  placement: 'hero' as 'hero' | 'header' | 'event' | 'voucher' | 'campaign',
  targetType: 'all' as 'all' | 'category' | 'brand' | 'seller' | 'products' | 'customLink',
  targetValue: '',
  productIds: [] as string[],
  sortOrder: '0',
  active: true,
};

export default function AdminBannersTab() {
  const token = getToken('admin');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [bannerRes, productRes, sellerRes] = await Promise.all([
      api.get<{ banners: Banner[] }>('/admin/banners', token),
      api.get<{ products: ProductOption[] }>('/admin/products', token),
      api.get<{ sellers: SellerOption[] }>('/admin/sellers', token),
    ]);
    setBanners(bannerRes.banners || []);
    setProducts(productRes.products || []);
    setSellers(sellerRes.sellers || []);
  };

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load banners')); }, []);

  const selectedProducts = useMemo(() => new Set(form.productIds), [form.productIds]);
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => !q || [p.name, p.brand, p.category].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0, 80);
  }, [products, productSearch]);

  const save = async () => {
    setLoading(true); setError(''); setMsg('');
    try {
      const targetLink = form.targetType === 'customLink' ? form.link : '';
      await api.post('/admin/banners', {
        ...form,
        link: targetLink,
        sortOrder: Number(form.sortOrder || 0),
      }, token);
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
        <h2 className="text-xl font-black flex items-center gap-2"><ImageIcon /> Hero, Event, Voucher & Campaign Photos</h2>
        <p className="text-sm text-gray-500 mt-1">Upload photos for homepage hero and the slim under-header event/voucher/campaign strip. Customers click a photo to see related products.</p>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {msg && <p className="mt-3 text-sm font-semibold text-green-600">{msg}</p>}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Display location</span>
            <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as any })}>
              <option value="hero">Homepage hero photo box</option>
              <option value="event">Under-header event photo</option>
              <option value="voucher">Under-header voucher photo</option>
              <option value="campaign">Under-header campaign photo</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Sort order</span>
            <input className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
          <input className="border rounded-xl p-3 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm" placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />

          {form.placement !== 'hero' && (
            <>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Related products type</span>
                <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value as any, targetValue: '', productIds: [] })}>
                  <option value="all">All products / latest products</option>
                  <option value="category">Category related</option>
                  <option value="brand">Brand related</option>
                  <option value="seller">Seller/store related</option>
                  <option value="products">Selected products</option>
                  <option value="customLink">Custom link</option>
                </select>
              </label>

              {form.targetType === 'category' && (
                <input className="border rounded-xl p-3 text-sm" placeholder="Category name, example: Men's Fashion" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
              )}
              {form.targetType === 'brand' && (
                <input className="border rounded-xl p-3 text-sm" placeholder="Brand name, example: Samsung" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
              )}
              {form.targetType === 'seller' && (
                <select className="border rounded-xl p-3 text-sm" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })}>
                  <option value="">Select seller/store</option>
                  {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.shopName || seller.name || seller.email}</option>)}
                </select>
              )}
              {form.targetType === 'customLink' && (
                <input className="border rounded-xl p-3 text-sm md:col-span-2" placeholder="Custom link, example: /daily-sale" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              )}
              {form.targetType === 'products' && (
                <div className="md:col-span-2 border rounded-2xl p-3 bg-gray-50">
                  <input className="w-full border rounded-xl p-3 text-sm mb-3" placeholder="Search products to select" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 bg-white rounded-xl border p-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={(e) => setForm({
                            ...form,
                            productIds: e.target.checked
                              ? [...form.productIds, product.id]
                              : form.productIds.filter((id) => id !== product.id),
                          })}
                        />
                        <span className="font-semibold line-clamp-1">{product.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">৳{Number(product.price || 0).toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <ImageUploader label="Display photo" helperText="Upload hero/event/voucher/campaign photo" value={form.image} onChange={(url) => setForm({ ...form, image: url })} token={token} />
        </div>
        <button onClick={save} disabled={loading} className="mt-4 bg-blue-600 disabled:bg-blue-300 text-white rounded-xl px-5 py-2.5 font-bold flex items-center gap-2"><Plus size={16}/>{loading ? 'Saving...' : 'Add display photo'}</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-2xl border overflow-hidden">
            <img src={banner.image} alt={banner.title || 'Display'} className="w-full h-40 object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase font-black text-orange-600">{banner.placement === 'hero' ? 'Hero photo box' : `${banner.placement || 'Display'} strip photo`}</p>
                  <h3 className="font-black text-gray-900">{banner.title || 'Untitled display photo'}</h3>
                  <p className="text-sm text-gray-500">{banner.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{banner.active === false ? 'Inactive' : 'Active'} • Sort {banner.sortOrder || 0} • Target {banner.targetType || 'all'}</p>
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
