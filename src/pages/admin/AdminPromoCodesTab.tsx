import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, X, ChevronDown, Loader2, AlertCircle,
  Check, Tag, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';

interface PromoCode {
  id: string; code: string; description: string | null;
  discount_type: 'percentage' | 'fixed'; discount_value: number;
  min_order_amount: number; max_uses: number | null; used_count: number;
  applies_to: 'all' | 'product' | 'category';
  product_id: string | null; category_slug: string | null;
  expires_at: string | null; active: boolean; created_at: string;
}

interface SimpleProduct { id: string; name: string; }

type PromoForm = {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minOrder: string;
  maxUses: string;
  appliesTo: 'all' | 'product' | 'category';
  productId: string;
  categorySlug: string;
  expiresAt: string;
  active: boolean;
};

const EMPTY: PromoForm = {
  code: '', description: '', discountType: 'percentage',
  discountValue: '', minOrder: '', maxUses: '',
  appliesTo: 'all', productId: '', categorySlug: '',
  expiresAt: '', active: true,
};

export default function AdminPromoCodesTab() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoForm>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: promoData }, { data: productData }] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('id,name').eq('active', true).limit(200),
    ]);
    setPromos(promoData ?? []);
    setProducts(productData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null); setForm({ ...EMPTY }); setFormError(''); setShowModal(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditing(p);
    setForm({
      code: p.code, description: p.description ?? '',
      discountType: p.discount_type, discountValue: String(p.discount_value),
      minOrder: p.min_order_amount ? String(p.min_order_amount) : '',
      maxUses: p.max_uses ? String(p.max_uses) : '',
      appliesTo: p.applies_to, productId: p.product_id ?? '',
      categorySlug: p.category_slug ?? '',
      expiresAt: p.expires_at ? p.expires_at.slice(0, 16) : '',
      active: p.active,
    });
    setFormError(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.code.trim()) { setFormError('Promo code is required'); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) { setFormError('Discount value must be greater than 0'); return; }
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) { setFormError('Percentage cannot exceed 100'); return; }
    if (form.appliesTo === 'product' && !form.productId) { setFormError('Select a product'); return; }
    if (form.appliesTo === 'category' && !form.categorySlug) { setFormError('Select a category'); return; }

    setSaving(true); setFormError('');
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discount_type: form.discountType,
        discount_value: Number(form.discountValue),
        min_order_amount: form.minOrder ? Number(form.minOrder) : 0,
        max_uses: form.maxUses ? Number(form.maxUses) : null,
        applies_to: form.appliesTo,
        product_id: form.appliesTo === 'product' ? form.productId : null,
        category_slug: form.appliesTo === 'category' ? form.categorySlug : null,
        expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: form.active,
      };

      if (editing) {
        const { error } = await supabase.from('promo_codes').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Promo code updated');
      } else {
        const { error } = await supabase.from('promo_codes').insert(payload);
        if (error) throw error;
        showToast('Promo code created');
      }
      setShowModal(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setFormError(msg.includes('unique') ? 'This code already exists.' : msg);
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this promo code?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (!error) { setPromos((prev) => prev.filter((p) => p.id !== id)); showToast('Deleted'); }
    setDeletingId(null);
  };

  const toggleActive = async (p: PromoCode) => {
    const { error } = await supabase.from('promo_codes').update({ active: !p.active }).eq('id', p.id);
    if (!error) {
      setPromos((prev) => prev.map((c) => c.id === p.id ? { ...c, active: !c.active } : c));
      showToast(p.active ? 'Deactivated' : 'Activated');
    }
  };

  const setF = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const appliesToLabel = (p: PromoCode) => {
    if (p.applies_to === 'product') return `Product: ${products.find((pr) => pr.id === p.product_id)?.name?.slice(0, 20) ?? p.product_id?.slice(0, 8)}...`;
    if (p.applies_to === 'category') return `Category: ${categories.find((c) => c.slug === p.category_slug)?.name ?? p.category_slug}`;
    return 'All orders';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{promos.length} promo code{promos.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors active:scale-95">
          <Plus size={15} /> New Promo Code
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16">
            <Tag size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No promo codes yet</p>
            <button onClick={openAdd} className="mt-3 text-blue-500 font-semibold text-sm hover:text-blue-600">+ Create first code</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Discount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Applies To</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Uses</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Expires</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Active</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const expired = p.expires_at && new Date(p.expires_at) < new Date();
                  return (
                    <tr key={p.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${expired ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 font-mono text-sm tracking-wider">{p.code}</p>
                        {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                        {p.min_order_amount > 0 && <p className="text-xs text-gray-400">Min: ৳{p.min_order_amount}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-base ${p.discount_type === 'percentage' ? 'text-blue-600' : 'text-green-600'}`}>
                          {p.discount_type === 'percentage' ? `${p.discount_value}%` : `৳${p.discount_value}`}
                        </span>
                        <span className="text-xs text-gray-400 ml-1 capitalize">{p.discount_type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{appliesToLabel(p)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-gray-700">{p.used_count}</span>
                        {p.max_uses && <span className="text-xs text-gray-400"> / {p.max_uses}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p.expires_at ? (
                          <span className={expired ? 'text-red-500 font-semibold' : 'text-gray-600'}>
                            {expired ? 'Expired ' : ''}{new Date(p.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleActive(p)}
                          className={`transition-colors ${p.active ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`}>
                          {p.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promo Code Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Promo Code' : 'New Promo Code'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Promo Code *</label>
                <input value={form.code} onChange={(e) => setF('code', e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20" maxLength={30}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <input value={form.description} onChange={(e) => setF('description', e.target.value)}
                  placeholder="Internal note about this code"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount Type *</label>
                  <div className="relative">
                    <select value={form.discountType} onChange={(e) => setF('discountType', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (৳)</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {form.discountType === 'percentage' ? 'Discount %' : 'Amount (৳)'} *
                  </label>
                  <input type="number" min="0" max={form.discountType === 'percentage' ? 100 : undefined}
                    value={form.discountValue} onChange={(e) => setF('discountValue', e.target.value)}
                    placeholder={form.discountType === 'percentage' ? '0–100' : '0'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* Min Order + Max Uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Order (৳)</label>
                  <input type="number" min="0" value={form.minOrder} onChange={(e) => setF('minOrder', e.target.value)}
                    placeholder="0 = no minimum"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Uses</label>
                  <input type="number" min="1" value={form.maxUses} onChange={(e) => setF('maxUses', e.target.value)}
                    placeholder="Leave blank = unlimited"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Applies To *</label>
                <div className="relative">
                  <select value={form.appliesTo} onChange={(e) => setF('appliesTo', e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors">
                    <option value="all">All Orders</option>
                    <option value="product">Specific Product</option>
                    <option value="category">Specific Category</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {form.appliesTo === 'product' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Product *</label>
                  <div className="relative">
                    <select value={form.productId} onChange={(e) => setF('productId', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors">
                      <option value="">Choose a product...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {form.appliesTo === 'category' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Category *</label>
                  <div className="relative">
                    <select value={form.categorySlug} onChange={(e) => setF('categorySlug', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors">
                      <option value="">Choose a category...</option>
                      {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date & Time</label>
                <input type="datetime-local" value={form.expiresAt} onChange={(e) => setF('expiresAt', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
                <p className="text-xs text-gray-400 mt-1">Leave blank for no expiry</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">Customers can use this code at checkout</p>
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
                {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Check size={14} />{editing ? 'Save Changes' : 'Create Code'}</>}
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
