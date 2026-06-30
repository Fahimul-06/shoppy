import { useEffect, useMemo, useState } from 'react';
import { Edit2, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import ImageUploader from '../../components/forms/ImageUploader';

type Placement = 'hero' | 'event' | 'voucher' | 'campaign';
type RelatedType = 'all' | 'category' | 'brand' | 'seller' | 'shop' | 'product' | 'search' | 'bank_card' | 'payment_type' | 'weekday';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  placement?: Placement | 'header';
  relatedType?: RelatedType;
  relatedValue?: string;
  products?: Array<{ id?: string; _id?: string; name?: string }> | string[];
  sortOrder?: number;
  active?: boolean;
};

type ProductOption = { id?: string; _id?: string; name: string; price?: number; category?: string; subcategory?: string; childCategory?: string; brand?: string };
type SellerOption = { id?: string; _id?: string; name?: string; shopName?: string; email?: string };

const emptyForm = {
  image: '',
  title: '',
  subtitle: '',
  link: '',
  placement: 'hero' as Placement,
  relatedType: 'all' as RelatedType,
  relatedValue: '',
  products: [] as string[],
  sortOrder: '0',
  active: true,
};

const placementLabel = (placement?: string) => {
  if (placement === 'event') return 'Event photo';
  if (placement === 'voucher') return 'Voucher photo';
  if (placement === 'campaign') return 'Campaign photo';
  if (placement === 'header') return 'Old header display';
  return 'Homepage hero photo box';
};

export default function AdminBannersTab() {
  const token = getToken('admin');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');

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


  const categoryValues = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort().map((v) => ({ value: String(v), label: String(v) })), [products]);
  const brandValues = useMemo(() => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort().map((v) => ({ value: String(v), label: String(v) })), [products]);
  const shopValues = useMemo(() => sellers.map((seller) => {
    const id = seller.id || seller._id || '';
    const name = seller.shopName || seller.name || seller.email || 'Seller shop';
    return { value: id, label: name };
  }).filter((item) => item.value), [sellers]);
  const paymentTypeValues = [
    { value: 'prepaid', label: 'Prepaid / Online payment' },
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'mobile_banking', label: 'Mobile Banking' },
    { value: 'card', label: 'Card Payment' },
  ];
  const bankCardValues = [
    'BRAC Bank', 'City Bank', 'DBBL', 'Eastern Bank', 'IFIC Bank', 'Prime Bank', 'Standard Chartered', 'UCB', 'Visa', 'Mastercard', 'American Express', 'Debit', 'Credit'
  ].map((value) => ({ value, label: value }));
  const weekdayValues = [
    { value: 'weekend', label: 'Weekend deal: Friday + Saturday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
  ];

  const relatedValueOptions = useMemo(() => {
    if (form.relatedType === 'category') return categoryValues;
    if (form.relatedType === 'brand') return brandValues;
    if (form.relatedType === 'seller' || form.relatedType === 'shop') return shopValues;
    if (form.relatedType === 'payment_type') return paymentTypeValues;
    if (form.relatedType === 'bank_card') return bankCardValues;
    if (form.relatedType === 'weekday') return weekdayValues;
    return [];
  }, [form.relatedType, categoryValues, brandValues, shopValues]);

  const relatedValuePlaceholder = () => {
    if (form.relatedType === 'search') return 'Example: Eid sale, phone, fashion';
    if (form.relatedType === 'bank_card') return 'Select bank or card type';
    if (form.relatedType === 'payment_type') return 'Select payment type';
    if (form.relatedType === 'weekday') return 'Select weekday/weekend';
    if (form.relatedType === 'shop' || form.relatedType === 'seller') return 'Select shop';
    return 'Select related value';
  };

  const save = async () => {
    setLoading(true); setError(''); setMsg('');
    try {
      const payload = {
        ...form,
        link: form.link || (form.placement === 'hero' ? '' : undefined),
        sortOrder: Number(form.sortOrder || 0),
      };
      if (editingId) {
        await api.put(`/admin/banners/${editingId}`, payload, token);
        setMsg('Display photo updated');
      } else {
        await api.post('/admin/banners', payload, token);
        setMsg('Display photo saved');
      }
      setForm(emptyForm);
      setEditingId(null);
      setProductSearch('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save display photo');
    } finally { setLoading(false); }
  };

  const getItemId = (item: any) => String(item?.id || item?._id || item || '');

  const startEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      image: banner.image || '',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      placement: (banner.placement === 'header' ? 'hero' : (banner.placement || 'hero')) as Placement,
      relatedType: (banner.relatedType || 'all') as RelatedType,
      relatedValue: banner.relatedValue || '',
      products: Array.isArray(banner.products) ? banner.products.map(getItemId).filter(Boolean) : [],
      sortOrder: String(banner.sortOrder || 0),
      active: banner.active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setProductSearch('');
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this display photo?')) return;
    await api.delete(`/admin/banners/${id}`, token);
    await load();
  };

  const selectedProductIds = new Set(form.products);
  const productOptions = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!q) return true;
        return [p.name, p.category, p.brand].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .slice(0, 80);
  }, [products, productSearch]);

  const toggleProduct = (id: string) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.includes(id) ? prev.products.filter((x) => x !== id) : [...prev.products, id],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black flex items-center gap-2"><ImageIcon /> Hero, Event, Campaign & Voucher Photos</h2>
          {editingId && <button onClick={cancelEdit} className="text-sm font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"><X size={16}/> Cancel edit</button>}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Upload homepage hero photos and the slim under-header event/campaign/voucher photos. Event, campaign, and voucher photos can open related product pages when customers click them.
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {msg && <p className="mt-3 text-sm font-semibold text-green-600">{msg}</p>}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Display location</span>
            <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as Placement })}>
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
          <input className="border rounded-xl p-3 text-sm md:col-span-2" placeholder="Optional link, example: /daily-sale. Leave empty for auto related-products page." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />

          {form.placement !== 'hero' && (
            <div className="md:col-span-2 rounded-2xl border border-orange-100 bg-orange-50/40 p-4 space-y-3">
              <p className="text-sm font-black text-gray-800">Related products after customer clicks this photo</p>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-gray-600">Related product rule</span>
                  <select className="mt-1 w-full border rounded-xl p-3 text-sm bg-white" value={form.relatedType} onChange={(e) => setForm({ ...form, relatedType: e.target.value as RelatedType, relatedValue: '', products: [] })}>
                    <option value="all">Show latest products</option>
                    <option value="category">Category</option>
                    <option value="brand">Brand</option>
                    <option value="shop">Shops / sellers</option>
                    <option value="payment_type">Payment type</option>
                    <option value="bank_card">Bank cards</option>
                    <option value="weekday">Weekday / weekend deal</option>
                    <option value="search">Search keyword</option>
                    <option value="product">Selected products</option>
                  </select>
                </label>
                {form.relatedType !== 'product' && form.relatedType !== 'all' && (
                  <label className="block">
                    <span className="text-xs font-bold text-gray-600">Related value</span>
                    {relatedValueOptions.length > 0 ? (
                      <select className="mt-1 w-full border rounded-xl p-3 text-sm bg-white" value={form.relatedValue} onChange={(e) => setForm({ ...form, relatedValue: e.target.value })}>
                        <option value="">{relatedValuePlaceholder()}</option>
                        {relatedValueOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : (
                      <input className="mt-1 w-full border rounded-xl p-3 text-sm bg-white" placeholder={relatedValuePlaceholder()} value={form.relatedValue} onChange={(e) => setForm({ ...form, relatedValue: e.target.value })} />
                    )}
                  </label>
                )}
              </div>

              {form.relatedType === 'product' && (
                <div>
                  <input className="w-full border rounded-xl p-3 text-sm bg-white" placeholder="Search and select products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  <div className="mt-2 max-h-52 overflow-y-auto border rounded-xl bg-white divide-y">
                    {productOptions.map((product) => {
                      const id = product.id || product._id || '';
                      return (
                        <label key={id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer">
                          <input type="checkbox" checked={selectedProductIds.has(id)} onChange={() => toggleProduct(id)} />
                          <span className="flex-1"><b>{product.name}</b><span className="text-gray-400"> • {product.category || 'No category'} • ৳{Number(product.price || 0).toLocaleString()}</span></span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Selected: {form.products.length} product(s)</p>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <ImageUploader label="Display photo" helperText="Upload hero/event/campaign/voucher photo" value={form.image} onChange={(url) => setForm({ ...form, image: url })} token={token} />
        </div>
        <button onClick={save} disabled={loading} className="mt-4 bg-blue-600 disabled:bg-blue-300 text-white rounded-xl px-5 py-2.5 font-bold flex items-center gap-2"><Plus size={16}/>{loading ? 'Saving...' : editingId ? 'Update display photo' : 'Add display photo'}</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-2xl border overflow-hidden">
            <img src={banner.image} alt={banner.title || 'Display'} className="w-full h-40 object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase font-black text-orange-600">{placementLabel(banner.placement)}</p>
                  <h3 className="font-black text-gray-900">{banner.title || 'Untitled display photo'}</h3>
                  <p className="text-sm text-gray-500">{banner.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{banner.active === false ? 'Inactive' : 'Active'} • Sort {banner.sortOrder || 0}</p>
                  {banner.placement !== 'hero' && (
                    <p className="text-xs text-gray-500 mt-1">Related: {banner.relatedType || 'all'} {banner.relatedValue ? `• ${banner.relatedValue}` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(banner)} className="text-blue-600 hover:text-blue-700" title="Edit banner"><Edit2 size={17}/></button>
                  <button onClick={() => remove(banner.id)} className="text-red-500 hover:text-red-600" title="Delete banner"><Trash2 size={17}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
