import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit2, Trash2, X, ChevronDown, Loader2, AlertCircle,
  Check, Search, Image, Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';

interface Product {
  id: string; name: string; price: number; original_price: number | null;
  image: string; category_slug: string; brand: string | null; stock: number;
  badge: string | null; discount: number | null; description: string | null;
  features: string[]; active: boolean; seller_id: string | null;
}

const EMPTY = {
  name: '', price: '', originalPrice: '', image: '',
  categorySlug: categories[0].slug, brand: '', stock: '0',
  badge: '', discount: '', description: '', features: '', active: true,
};

function UploadOrUrl({ value, onChange, userId }: {
  value: string; onChange: (v: string) => void; userId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        onChange(data.publicUrl);
      }
    } finally { setUploading(false); }
  };

  return (
    <div className="flex gap-3">
      <div onClick={() => ref.current?.click()}
        className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 cursor-pointer hover:border-blue-400 transition-colors">
        {value
          ? <img src={value} alt="preview" className="w-full h-full object-cover" />
          : <div className="flex flex-col items-center justify-center h-full gap-1">
              {uploading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Upload size={16} className="text-gray-300" />}
              <span className="text-[10px] text-gray-400">{uploading ? 'Uploading' : 'Upload'}</span>
            </div>
        }
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      <div className="flex-1">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste image URL"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
        <p className="text-xs text-gray-400 mt-1">Upload file or enter URL (Pexels, etc.)</p>
      </div>
    </div>
  );
}

export default function AdminProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setAdminId(data.user.id); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id,name,price,original_price,image,category_slug,brand,stock,badge,discount,description,features,active,seller_id')
      .order('created_at', { ascending: false });
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null); setForm({ ...EMPTY }); setFormError(''); setShowModal(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, price: String(p.price),
      originalPrice: p.original_price ? String(p.original_price) : '',
      image: p.image, categorySlug: p.category_slug, brand: p.brand ?? '',
      stock: String(p.stock), badge: p.badge ?? '',
      discount: p.discount ? String(p.discount) : '',
      description: p.description ?? '',
      features: (p.features ?? []).join('\n'),
      active: p.active,
    });
    setFormError(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.price || Number(form.price) <= 0) { setFormError('Valid price is required'); return; }
    if (!form.image.trim()) { setFormError('Image is required'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        original_price: form.originalPrice ? Number(form.originalPrice) : null,
        image: form.image.trim(),
        images: [form.image.trim()],
        category_slug: form.categorySlug,
        brand: form.brand.trim() || null,
        stock: Number(form.stock),
        badge: form.badge || null,
        discount: form.discount ? Number(form.discount) : null,
        description: form.description.trim() || null,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        active: form.active,
        rating: editing?.price ?? 0,
        review_count: 0,
      };
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Product updated');
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, seller_id: null, rating: 0 });
        if (error) throw error;
        showToast('Product added');
      }
      setShowModal(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) { setProducts((prev) => prev.filter((p) => p.id !== id)); showToast('Deleted'); }
    setDeletingId(null);
  };

  const setF = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = products.filter((p) => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand ?? '').toLowerCase().includes(search.toLowerCase());
    const mc = !catFilter || p.category_slug === catFilter;
    return ms && mc;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
        </div>
        <div className="relative">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors active:scale-95">
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Source</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                        <span className="font-medium text-gray-800 line-clamp-1 max-w-[180px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{p.category_slug.replace(/-/g,' ')}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">৳{Number(p.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${p.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.seller_id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {p.seller_id ? 'Seller' : 'Platform'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => del(p.id)} disabled={deletingId === p.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                          {deletingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No products found</div>}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name *</label>
                <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="Full product name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Image *</label>
                <UploadOrUrl value={form.image} onChange={(v) => setF('image', v)} userId={adminId} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'price', label: 'Price (৳) *', placeholder: '0' },
                  { key: 'originalPrice', label: 'Original Price (৳)', placeholder: 'Before discount' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <input type="number" min="0" value={form[key as keyof typeof form] as string}
                      onChange={(e) => setF(key, e.target.value)} placeholder={placeholder}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                  <div className="relative">
                    <select value={form.categorySlug} onChange={(e) => setF('categorySlug', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors">
                      {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand</label>
                  <input value={form.brand} onChange={(e) => setF('brand', e.target.value)} placeholder="Brand name"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock *</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setF('stock', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Badge</label>
                  <div className="relative">
                    <select value={form.badge} onChange={(e) => setF('badge', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors">
                      <option value="">None</option>
                      <option value="sale">Sale</option>
                      <option value="new">New</option>
                      <option value="hot">Hot</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount %</label>
                  <input type="number" min="0" max="99" value={form.discount} onChange={(e) => setF('discount', e.target.value)} placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setF('description', e.target.value)}
                  rows={3} placeholder="Product description..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Key Features</label>
                <textarea value={form.features} onChange={(e) => setF('features', e.target.value)}
                  rows={3} placeholder={"One feature per line:\nFast charging\nWaterproof"}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors resize-none font-mono" />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Visible to customers</p>
                  <p className="text-xs text-gray-400">Toggle off to hide from storefront</p>
                </div>
                <button type="button" onClick={() => setF('active', !form.active)}
                  className={`w-11 h-6 rounded-full transition-all relative ${form.active ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Check size={14} />{editing ? 'Save Changes' : 'Add Product'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2">
          <Check size={14} className="text-green-400" /> {toast}
        </div>
      )}
    </div>
  );
}
