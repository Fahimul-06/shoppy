import React, { useEffect, useState } from 'react';
import { Check, Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { categories } from '../../data/categories';
import ImageUploader from '../../components/forms/ImageUploader';
import CategoryDropdowns from '../../components/forms/CategoryDropdowns';

type Product = any;

const EMPTY = {
  name: '',
  price: '',
  originalPrice: '',
  image: '',
  category: categories[0]?.slug || 'all',
  subcategory: '',
  childCategory: '',
  brand: '',
  stock: '1',
  badge: '',
  discount: '',
  description: '',
  features: '',
  active: true,
};

export default function AdminProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await api.get<{ products: Product[] }>('/admin/products', getToken('admin'));
    setProducts(r.products);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError('');
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      ...EMPTY,
      name: p.name || '',
      price: p.price || '',
      originalPrice: p.originalPrice || '',
      image: p.image || p.images?.[0] || '',
      category: p.category || EMPTY.category,
      subcategory: p.subcategory || p.subCategory || '',
      childCategory: p.childCategory || p.subSubCategory || '',
      brand: p.brand || '',
      stock: p.stock ?? 0,
      badge: p.badge || '',
      discount: p.discount || '',
      description: p.description || '',
      features: (p.features || []).join('\n'),
      active: p.active !== false,
    });
    setError('');
    setModal(true);
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock),
        discount: form.discount ? Number(form.discount) : undefined,
        features: String(form.features || '').split('\n').map((x) => x.trim()).filter(Boolean),
        images: [form.image].filter(Boolean),
        badge: form.badge || null,
        subcategory: form.subcategory || '',
        childCategory: form.childCategory || '',
      };
      if (editing) await api.put(`/admin/products/${editing.id}`, payload, getToken('admin'));
      else await api.post('/admin/products', payload, getToken('admin'));
      setModal(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete product?')) return;
    await api.delete(`/admin/products/${id}`, getToken('admin'));
    await load();
  };

  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.name || slug;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-black">Products</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-x-auto">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="p-3 text-left">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 flex gap-3 items-center"><img src={p.image} className="w-10 h-10 rounded-lg object-cover" /><span className="font-semibold">{p.name}</span></td>
                  <td className="text-center">
                    <div className="font-semibold">{categoryLabel(p.category)}</div>
                    {(p.subcategory || p.childCategory) && <div className="text-xs text-gray-500">{[p.subcategory, p.childCategory].filter(Boolean).join(' / ')}</div>}
                  </td>
                  <td className="text-center">৳{Number(p.price).toLocaleString()}</td>
                  <td className="text-center">{p.stock}</td>
                  <td className="text-center">{p.active ? 'Active' : 'Hidden'}</td>
                  <td className="p-3 text-right"><button onClick={() => openEdit(p)} className="p-2 text-blue-600"><Edit2 size={16} /></button><button onClick={() => del(p.id)} className="p-2 text-red-500"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h3 className="font-black">{editing ? 'Edit' : 'Add'} Product</h3><button onClick={() => setModal(false)}><X /></button></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="border rounded-xl p-3 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="border rounded-xl p-3 text-sm" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <input className="border rounded-xl p-3 text-sm" placeholder="Original price" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
              <input className="border rounded-xl p-3 text-sm" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              <div className="sm:col-span-2">
                <CategoryDropdowns
                  category={form.category}
                  subcategory={form.subcategory}
                  childCategory={form.childCategory}
                  onChange={(next) => setForm({ ...form, ...next })}
                />
              </div>
              <input className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              <div className="sm:col-span-2"><ImageUploader value={form.image} token={getToken('admin')} onChange={(url) => setForm({ ...form, image: url })} /></div>
              <input className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Or paste Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
              <textarea className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <textarea className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Features, one per line" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <button onClick={save} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2"><Check size={16} /> Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
