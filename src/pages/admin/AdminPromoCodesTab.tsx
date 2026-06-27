import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { categoryOptions, subSubMap } from '../../data/categoryOptions';

type ProductOption = { id: string; name: string; brand?: string; category?: string; subcategory?: string; childCategory?: string; image?: string; seller?: any };
type SellerOption = { id: string; name?: string; shopName?: string; email?: string; shopLogo?: string };

type PromoForm = {
  code: string;
  description: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  maxUses: string;
  appliesTo: string;
  categories: string[];
  subcategories: string[];
  childCategories: string[];
  brands: string[];
  sellers: string[];
  products: string[];
  startsAt: string;
  expiresAt: string;
  active: boolean;
};

const emptyForm: PromoForm = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '0',
  maxDiscountAmount: '0',
  maxUses: '',
  appliesTo: 'all',
  categories: [],
  subcategories: [],
  childCategories: [],
  brands: [],
  sellers: [],
  products: [],
  startsAt: '',
  expiresAt: '',
  active: true,
};

function idOf(value: any) {
  return String(value?.id || value?._id || value || '');
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function promoToForm(promo: any): PromoForm {
  return {
    code: promo.code || '',
    description: promo.description || '',
    discountType: promo.discountType || 'percentage',
    discountValue: String(promo.discountValue ?? ''),
    minOrderAmount: String(promo.minOrderAmount ?? 0),
    maxDiscountAmount: String(promo.maxDiscountAmount ?? 0),
    maxUses: promo.maxUses == null ? '' : String(promo.maxUses),
    appliesTo: promo.appliesTo || 'all',
    categories: Array.isArray(promo.categories) ? promo.categories.map(String) : [],
    subcategories: Array.isArray(promo.subcategories) ? promo.subcategories.map(String) : [],
    childCategories: Array.isArray(promo.childCategories) ? promo.childCategories.map(String) : [],
    brands: Array.isArray(promo.brands) ? promo.brands.map(String) : [],
    sellers: Array.isArray(promo.sellers) ? promo.sellers.map(idOf).filter(Boolean) : [],
    products: Array.isArray(promo.products) ? promo.products.map(idOf).filter(Boolean) : [],
    startsAt: toDateTimeLocal(promo.startsAt),
    expiresAt: toDateTimeLocal(promo.expiresAt),
    active: promo.active !== false,
  };
}

function normalizePayload(form: PromoForm) {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    discountValue: Number(form.discountValue || 0),
    minOrderAmount: Number(form.minOrderAmount || 0),
    maxDiscountAmount: Number(form.maxDiscountAmount || 0),
    maxUses: form.maxUses === '' ? null : Number(form.maxUses),
    startsAt: form.startsAt || null,
    expiresAt: form.expiresAt || null,
  };
}

function MultiSelect({ label, value, options, onChange, placeholder }: { label: string; value: string[]; options: { value: string; label: string }[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-600">{label}</span>
      <select multiple value={value} onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))} className="mt-1 w-full h-28 border rounded-xl p-2 text-sm focus:outline-none focus:border-blue-400">
        {options.length === 0 && <option disabled>{placeholder || 'No options available'}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p className="text-[11px] text-gray-400 mt-1">Hold Ctrl/Command to select multiple.</p>
    </label>
  );
}

export default function AdminPromoCodesTab() {
  const [promos, setPromos] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = getToken('admin');
  const load = async () => {
    const [promoRes, productRes, sellerRes] = await Promise.all([
      api.get<{ promos: any[] }>('/admin/promos', token),
      api.get<{ products: ProductOption[] }>('/admin/products', token),
      api.get<{ sellers: SellerOption[] }>('/admin/sellers', token),
    ]);
    setPromos(promoRes.promos || []);
    setProducts(productRes.products || []);
    setSellers(sellerRes.sellers || []);
  };

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load promos')); }, []);

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort() as string[], [products]);
  const categoryValues = useMemo(() => categoryOptions.map((c) => ({ value: c.name, label: c.name })), []);
  const subcategoryValues = useMemo(() => Array.from(new Set([
    ...products.map((p) => p.subcategory).filter(Boolean),
    ...Object.values(subSubMap).flatMap((group) => Object.keys(group)),
  ])).sort().map((v) => ({ value: String(v), label: String(v) })), [products]);
  const childValues = useMemo(() => Array.from(new Set([
    ...products.map((p) => p.childCategory).filter(Boolean),
    ...Object.values(subSubMap).flatMap((group) => Object.values(group).flat()),
  ])).sort().map((v) => ({ value: String(v), label: String(v) })), [products]);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = normalizePayload(form);
      if (!payload.code) throw new Error('Promo code is required');
      if (!payload.discountValue || payload.discountValue <= 0) throw new Error('Discount value must be greater than 0');
      if (editingId) await api.put(`/admin/promos/${editingId}`, payload, token);
      else await api.post('/admin/promos', payload, token);
      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save promo');
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this promo code?')) return;
    await api.delete(`/admin/promos/${id}`, token);
    await load();
  };

  const startEdit = (promo: any) => {
    setEditingId(promo.id);
    setForm(promoToForm(promo));
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const targetSummary = (p: any) => {
    if (p.appliesTo === 'all') return 'All products';
    const parts = [];
    if (p.categories?.length) parts.push(`Categories: ${p.categories.join(', ')}`);
    if (p.subcategories?.length) parts.push(`Sub: ${p.subcategories.join(', ')}`);
    if (p.childCategories?.length) parts.push(`Child: ${p.childCategories.join(', ')}`);
    if (p.brands?.length) parts.push(`Brands: ${p.brands.join(', ')}`);
    if (p.sellers?.length) parts.push(`Sellers: ${p.sellers.map((s: any) => s.shopName || s.name || s.email || s).join(', ')}`);
    if (p.products?.length) parts.push(`Products: ${p.products.map((x: any) => x.name || x).join(', ')}`);
    return parts.join(' • ') || p.appliesTo;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black mb-1">Promo Codes</h2>
            <p className="text-sm text-gray-500">Create and edit promos for all products or selected category, brand, seller, or products.</p>
          </div>
          {editingId && <button onClick={reset} className="text-sm font-bold text-gray-500 hover:text-red-500 flex items-center gap-1"><X size={16}/>Cancel edit</button>}
        </div>
        {error && <div className="mb-3 bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-sm">{error}</div>}
        <div className="grid md:grid-cols-4 gap-3">
          <input className="border rounded-xl p-2 text-sm" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className="border rounded-xl p-2 text-sm" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select>
          <input className="border rounded-xl p-2 text-sm" placeholder="Discount value" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
          <input className="border rounded-xl p-2 text-sm" placeholder="Minimum order" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
          <input className="border rounded-xl p-2 text-sm md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="border rounded-xl p-2 text-sm" placeholder="Max discount amount" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} />
          <input className="border rounded-xl p-2 text-sm" placeholder="Max uses" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
          <label className="block"><span className="text-xs font-bold text-gray-600">Starts at</span><input type="datetime-local" className="mt-1 w-full border rounded-xl p-2 text-sm" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
          <label className="block"><span className="text-xs font-bold text-gray-600">Expires at</span><input type="datetime-local" className="mt-1 w-full border rounded-xl p-2 text-sm" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
          <label className="block"><span className="text-xs font-bold text-gray-600">Target type</span><select className="mt-1 w-full border rounded-xl p-2 text-sm" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}><option value="all">All products</option><option value="category">Selected category/subcategory</option><option value="brand">Selected brand</option><option value="seller">Selected seller</option><option value="product">Selected products</option><option value="custom">Custom mix</option></select></label>
          <label className="flex items-center gap-2 pt-6 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        </div>

        {form.appliesTo !== 'all' && (
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {(form.appliesTo === 'category' || form.appliesTo === 'custom') && <><MultiSelect label="Categories" value={form.categories} options={categoryValues} onChange={(v) => setForm({ ...form, categories: v })} /><MultiSelect label="Sub categories" value={form.subcategories} options={subcategoryValues} onChange={(v) => setForm({ ...form, subcategories: v })} /><MultiSelect label="Child categories" value={form.childCategories} options={childValues} onChange={(v) => setForm({ ...form, childCategories: v })} /></>}
            {(form.appliesTo === 'brand' || form.appliesTo === 'custom') && <MultiSelect label="Brands" value={form.brands} options={brands.map((b) => ({ value: b, label: b }))} onChange={(v) => setForm({ ...form, brands: v })} />}
            {(form.appliesTo === 'seller' || form.appliesTo === 'custom') && <MultiSelect label="Sellers" value={form.sellers} options={sellers.map((s) => ({ value: s.id, label: `${s.shopName || s.name || 'Seller'}${s.email ? ` — ${s.email}` : ''}` }))} onChange={(v) => setForm({ ...form, sellers: v })} />}
            {(form.appliesTo === 'product' || form.appliesTo === 'custom') && <MultiSelect label="Products" value={form.products} options={products.map((p) => ({ value: p.id, label: `${p.name}${p.brand ? ` — ${p.brand}` : ''}` }))} onChange={(v) => setForm({ ...form, products: v })} />}
          </div>
        )}
        <button onClick={save} disabled={loading} className="mt-4 bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-bold px-5 py-2.5 flex items-center gap-2">
          {editingId ? <Save size={16}/> : <Plus size={16}/>} {loading ? 'Saving...' : editingId ? 'Update Promo' : 'Create Promo'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Code</th><th>Discount</th><th>Target</th><th>Min</th><th>Uses</th><th>Active</th><th></th></tr></thead>
          <tbody>{promos.map((p) => <tr key={p.id} className="border-t align-top"><td className="p-3 font-bold text-orange-600">{p.code}<p className="text-xs text-gray-500 font-normal">{p.description}</p></td><td className="p-3 text-center">{p.discountType === 'percentage' ? `${p.discountValue}%` : `৳${p.discountValue}`}</td><td className="p-3 max-w-md text-xs text-gray-600">{targetSummary(p)}</td><td className="p-3 text-center">৳{Number(p.minOrderAmount || 0).toLocaleString()}</td><td className="p-3 text-center">{p.usedCount || 0}{p.maxUses ? `/${p.maxUses}` : ''}</td><td className="p-3 text-center">{p.active ? 'Yes' : 'No'}</td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-700"><Edit2 size={16}/></button><button onClick={() => del(p.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16}/></button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
