import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, LayoutDashboard, Package, LogOut, Plus, Edit2, Trash2,
  X, ChevronDown, Loader2, AlertCircle, Check, Image, Upload,
  TrendingUp, ShoppingBag, DollarSign, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';

interface Seller {
  id: string; name: string; phone: string; shop_name: string;
  shop_address: string; status: string;
}

interface Product {
  id: string; name: string; price: number; original_price: number | null;
  image: string; category_slug: string; brand: string | null; stock: number;
  badge: string | null; discount: number | null; description: string | null;
  features: string[]; active: boolean;
}

const EMPTY_PRODUCT = {
  name: '', price: '', originalPrice: '', image: '',
  categorySlug: categories[0].slug, brand: '', stock: '1',
  badge: '', discount: '', description: '', features: '', active: true,
};

type Tab = 'dashboard' | 'products';

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ImageUploadField({ value, onChange }: {
  value: string; onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const handleFile = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Image</label>
      <div className="flex gap-3">
        <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 cursor-pointer hover:border-orange-400 transition-colors"
          onClick={() => ref.current?.click()}>
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1">
              {uploading ? <Loader2 size={18} className="animate-spin text-orange-500" /> : <Image size={18} className="text-gray-300" />}
              <span className="text-[10px] text-gray-400">{uploading ? 'Uploading...' : 'Upload'}</span>
            </div>
          )}
          <input ref={ref} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste an image URL"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1.5">Upload a file or enter a direct image URL</p>
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/seller/login'); return; }

      const { data: sellerData } = await supabase
        .from('sellers').select('*').eq('id', user.id).maybeSingle();
      if (!sellerData) { navigate('/seller/register'); return; }
      setSeller(sellerData);

      await loadProducts(user.id);
      setLoading(false);
    })();
  }, [navigate]);

  const loadProducts = async (uid?: string) => {
    const id = uid ?? seller?.id;
    if (!id) return;
    const { data } = await supabase
      .from('products')
      .select('id,name,price,original_price,image,category_slug,brand,stock,badge,discount,description,features,active')
      .eq('seller_id', id)
      .order('created_at', { ascending: false });
    setProducts(data ?? []);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_PRODUCT });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      originalPrice: p.original_price ? String(p.original_price) : '',
      image: p.image,
      categorySlug: p.category_slug,
      brand: p.brand ?? '',
      stock: String(p.stock),
      badge: p.badge ?? '',
      discount: p.discount ? String(p.discount) : '',
      description: p.description ?? '',
      features: (p.features ?? []).join('\n'),
      active: p.active,
    });
    setFormError('');
    setShowModal(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Product name is required';
    if (!form.price || Number(form.price) <= 0) return 'Valid price is required';
    if (!form.image.trim()) return 'Product image is required';
    if (!form.stock || Number(form.stock) < 0) return 'Stock quantity is required';
    return '';
  };

  const saveProduct = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError('');
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
        rating: 0,
        review_count: 0,
      };

      if (editing) {
        const { error } = await supabase
          .from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Product updated successfully');
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        showToast('Product added successfully');
      }
      setShowModal(false);
      await loadProducts();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted');
    } finally {
      setDeletingId(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/seller/login');
  };

  const setF = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  const activeCount = products.filter((p) => p.active).length;
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col hidden lg:flex">
        <div className="px-5 py-5 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Store size={15} className="text-white" />
            </div>
            <span className="font-extrabold text-gray-900 text-base">Seller Center</span>
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base">{seller?.shop_name[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{seller?.shop_name}</p>
              <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                seller?.status === 'approved' ? 'bg-green-100 text-green-700' :
                seller?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  seller?.status === 'approved' ? 'bg-green-500' :
                  seller?.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                {seller?.status === 'pending' ? 'Under Review' : seller?.status}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {([
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'products', label: 'My Products', icon: Package },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-5 sm:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-gray-900 text-lg">
              {tab === 'dashboard' ? 'Dashboard' : 'My Products'}
            </h1>
            <p className="text-xs text-gray-500">
              {tab === 'dashboard' ? `Welcome back, ${seller?.name}` : `${products.length} product${products.length !== 1 ? 's' : ''} listed`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile nav */}
            <div className="flex lg:hidden gap-1">
              <button onClick={() => setTab('dashboard')} className={`p-2 rounded-lg ${tab === 'dashboard' ? 'bg-orange-100 text-orange-600' : 'text-gray-500'}`}>
                <LayoutDashboard size={18} />
              </button>
              <button onClick={() => setTab('products')} className={`p-2 rounded-lg ${tab === 'products' ? 'bg-orange-100 text-orange-600' : 'text-gray-500'}`}>
                <Package size={18} />
              </button>
              <button onClick={signOut} className="p-2 rounded-lg text-gray-500 hover:text-red-500">
                <LogOut size={18} />
              </button>
            </div>
            {tab === 'products' && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors active:scale-95"
              >
                <Plus size={16} /> Add Product
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 sm:p-8">
          {/* Account status banner */}
          {seller?.status === 'pending' && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-semibold text-sm">Account Under Review</p>
                <p className="text-amber-700 text-xs mt-0.5">Your documents are being verified. Products added now will be visible once approved (24–48 hrs).</p>
              </div>
            </div>
          )}

          {/* ── Dashboard tab ── */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Package} label="Total Products" value={products.length} color="bg-orange-500" />
                <StatCard icon={Eye} label="Active Listings" value={activeCount} color="bg-green-500" />
                <StatCard icon={ShoppingBag} label="Total Stock" value={products.reduce((s, p) => s + p.stock, 0)} color="bg-blue-500" />
                <StatCard icon={DollarSign} label="Inventory Value" value={`৳${totalValue.toLocaleString()}`} color="bg-purple-500" />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Recent Products</h2>
                  <button onClick={() => setTab('products')} className="text-orange-500 text-sm font-semibold hover:text-orange-600">View all →</button>
                </div>
                {products.length === 0 ? (
                  <div className="text-center py-10">
                    <Package size={36} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No products yet</p>
                    <button onClick={openAdd} className="mt-3 text-orange-500 font-semibold text-sm hover:text-orange-600">
                      + Add your first product
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors">
                        <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">৳{p.price.toLocaleString()} · Stock: {p.stock}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active ? 'Live' : 'Hidden'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <TrendingUp size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Seller Tips</h2>
                    <p className="text-xs text-gray-500">Grow your sales</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Add clear, high-quality product photos to increase clicks',
                    'Write detailed descriptions to improve search visibility',
                    'Keep your stock counts up-to-date to avoid cancellations',
                    'Offer competitive prices — check similar products on the platform',
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── Products tab ── */}
          {tab === 'products' && (
            <div>
              {products.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package size={28} className="text-orange-300" />
                  </div>
                  <h3 className="font-bold text-gray-700 mb-2">No Products Yet</h3>
                  <p className="text-gray-400 text-sm mb-6">Start adding your products to reach customers.</p>
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    <Plus size={16} /> Add First Product
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Price</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-orange-50/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                                <span className="font-medium text-gray-800 line-clamp-1 max-w-[200px]">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500 capitalize">{p.category_slug.replace(/-/g, ' ')}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">৳{p.price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-semibold ${p.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{p.stock}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.active ? 'Live' : 'Hidden'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEdit(p)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteProduct(p.id)}
                                  disabled={deletingId === p.id}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add/Edit Product Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name *</label>
                <input value={form.name} onChange={(e) => setF('name', e.target.value)}
                  placeholder="Full product name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
              </div>

              {/* Image */}
              <ImageUploadField value={form.image} onChange={(url) => setF('image', url)} />

              {/* Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (৳) *</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => setF('price', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Original Price (৳)</label>
                  <input type="number" min="0" value={form.originalPrice} onChange={(e) => setF('originalPrice', e.target.value)}
                    placeholder="Before discount"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* Category + Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                  <div className="relative">
                    <select value={form.categorySlug} onChange={(e) => setF('categorySlug', e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors">
                      {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand</label>
                  <input value={form.brand} onChange={(e) => setF('brand', e.target.value)}
                    placeholder="Brand name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* Stock + Badge + Discount */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock *</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setF('stock', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Badge</label>
                  <div className="relative">
                    <select value={form.badge} onChange={(e) => setF('badge', e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors">
                      <option value="">None</option>
                      <option value="sale">Sale</option>
                      <option value="new">New</option>
                      <option value="hot">Hot</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount %</label>
                  <input type="number" min="0" max="99" value={form.discount} onChange={(e) => setF('discount', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setF('description', e.target.value)}
                  rows={3} placeholder="Describe your product..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors resize-none" />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Key Features</label>
                <textarea value={form.features} onChange={(e) => setF('features', e.target.value)}
                  rows={4} placeholder={"One feature per line:\nFast charging\nWaterproof\n5x zoom camera"}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors resize-none font-mono" />
                <p className="text-xs text-gray-400 mt-1">Enter one feature per line</p>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Visible to customers</p>
                  <p className="text-xs text-gray-400">Toggle off to hide from the storefront</p>
                </div>
                <button
                  type="button"
                  onClick={() => setF('active', !form.active)}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.active ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveProduct} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95">
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Check size={15} />{editing ? 'Save Changes' : 'Add Product'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 z-50 animate-fade-in">
          <Check size={15} className="text-green-400" /> {toast}
        </div>
      )}
    </div>
  );
}
