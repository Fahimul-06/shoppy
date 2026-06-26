import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Edit2, Loader2, LogOut, Package, Plus, Store, Trash2, User, X } from 'lucide-react';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';
import { categories } from '../../data/categories';
import ImageUploader from '../../components/forms/ImageUploader';
import PasswordOtpPanel from '../../components/forms/PasswordOtpPanel';
import PhoneOtpPanel from '../../components/forms/PhoneOtpPanel';

const EMPTY = {
  name: '',
  price: '',
  originalPrice: '',
  image: '',
  category: categories[0]?.slug || 'all',
  brand: '',
  stock: '1',
  description: '',
  features: '',
  active: true,
};

const emptyProfile = {
  name: '',
  phone: '',
  shopName: '',
  shopAddress: '',
  businessType: '',
  nidNumber: '',
  tinNumber: '',
  bankName: '',
  bankAccount: '',
};

export default function SellerDashboardPage() {
  const nav = useNavigate();
  const [seller, setSeller] = useState<any>(getSessionUser('seller'));
  const [profileForm, setProfileForm] = useState<any>({ ...emptyProfile, ...(getSessionUser('seller') || {}) });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const load = async () => {
    const r = await api.get<{ products: any[] }>('/seller/products', getToken('seller'));
    setProducts(r.products);
  };

  useEffect(() => {
    const t = getToken('seller');
    if (!t) {
      nav('/seller/login');
      return;
    }

    api.get<{ seller: any }>('/seller/me', t)
      .then((r) => {
        setSeller(r.seller);
        setProfileForm({ ...emptyProfile, ...r.seller });
        localStorage.setItem('sellerUser', JSON.stringify(r.seller));
        return load();
      })
      .catch(() => {
        clearSession('seller');
        nav('/seller/login');
      })
      .finally(() => setLoading(false));
  }, [nav]);

  const logout = () => {
    clearSession('seller');
    nav('/seller/login');
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage('');
    try {
      const r = await api.put<{ seller: any }>('/seller/profile', profileForm, getToken('seller'));
      setSeller(r.seller);
      setProfileForm({ ...emptyProfile, ...r.seller });
      localStorage.setItem('sellerUser', JSON.stringify(r.seller));
      setProfileMessage('Profile updated successfully');
    } catch (e) {
      setProfileMessage(e instanceof Error ? e.message : 'Profile update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const open = (p?: any) => {
    setEditing(p || null);
    setForm(p ? { ...EMPTY, ...p, image: p.image || p.images?.[0] || '', features: (p.features || []).join('\n') } : EMPTY);
    setModal(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      stock: Number(form.stock),
      images: [form.image].filter(Boolean),
      features: String(form.features || '').split('\n').filter(Boolean),
    };
    if (editing) await api.put(`/seller/products/${editing.id}`, payload, getToken('seller'));
    else await api.post('/seller/products', payload, getToken('seller'));
    setModal(false);
    await load();
  };

  const del = async (id: string) => {
    if (confirm('Delete product?')) {
      await api.delete(`/seller/products/${id}`, getToken('seller'));
      await load();
    }
  };

  const updateProfile = (key: string, value: string) => setProfileForm((prev: any) => ({ ...prev, [key]: value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between">
          <div className="flex gap-3 items-center">
            <Store className="text-orange-500" />
            <div>
              <h1 className="font-black">{seller?.shopName || 'Seller Dashboard'}</h1>
              <p className="text-xs text-gray-500 capitalize">Status: {seller?.status}</p>
            </div>
          </div>
          <button onClick={logout} className="text-red-500 flex gap-2 items-center"><LogOut size={16} /> Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Products</p><p className="text-3xl font-black">{products.length}</p></div>
          <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Stock</p><p className="text-3xl font-black">{products.reduce((s, p) => s + Number(p.stock || 0), 0)}</p></div>
          <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Account</p><p className="text-xl font-black capitalize">{seller?.status}</p></div>
        </div>

        {seller?.status !== 'approved' && <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-4 mb-4 text-sm">Your seller account is not approved yet. You can prepare products, but admin approval is required.</div>}

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-2xl p-5 border">
            <h2 className="font-black text-lg flex items-center gap-2 mb-4"><User size={18}/> Seller Profile</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="border rounded-xl p-3 text-sm" placeholder="Seller name" value={profileForm.name || ''} onChange={(e) => updateProfile('name', e.target.value)} />
              <p className="border rounded-xl p-3 text-sm text-gray-500 bg-gray-50">Phone: <b>{seller?.phone || 'Not added'}</b><br/><span className="text-xs">Change it below using OTP verification.</span></p>
              <input className="border rounded-xl p-3 text-sm" placeholder="Shop name" value={profileForm.shopName || ''} onChange={(e) => updateProfile('shopName', e.target.value)} />
              <input className="border rounded-xl p-3 text-sm" placeholder="Business type" value={profileForm.businessType || ''} onChange={(e) => updateProfile('businessType', e.target.value)} />
              <input className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Shop address" value={profileForm.shopAddress || ''} onChange={(e) => updateProfile('shopAddress', e.target.value)} />
              <input className="border rounded-xl p-3 text-sm" placeholder="NID number" value={profileForm.nidNumber || ''} onChange={(e) => updateProfile('nidNumber', e.target.value)} />
              <input className="border rounded-xl p-3 text-sm" placeholder="TIN number" value={profileForm.tinNumber || ''} onChange={(e) => updateProfile('tinNumber', e.target.value)} />
              <input className="border rounded-xl p-3 text-sm" placeholder="Bank name" value={profileForm.bankName || ''} onChange={(e) => updateProfile('bankName', e.target.value)} />
              <input className="border rounded-xl p-3 text-sm" placeholder="Bank account" value={profileForm.bankAccount || ''} onChange={(e) => updateProfile('bankAccount', e.target.value)} />
            </div>
            {profileMessage && <p className="text-sm text-gray-600 mt-3">{profileMessage}</p>}
            <button onClick={saveProfile} disabled={savingProfile} className="mt-4 w-full bg-orange-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2">
              {savingProfile ? <Loader2 className="animate-spin" size={15}/> : <Check size={15}/>} Save Profile
            </button>
          </div>

          <div className="space-y-5">
            <PhoneOtpPanel role="seller" basePath="/seller" token={getToken('seller')} currentPhone={seller?.phone} onChanged={(updated) => { setSeller(updated); setProfileForm({ ...emptyProfile, ...updated }); localStorage.setItem('sellerUser', JSON.stringify(updated)); }} />
            <PasswordOtpPanel role="seller" basePath="/seller" token={getToken('seller')} email={seller?.email} phone={seller?.phone} />
          </div>
        </div>

        <div className="flex justify-between mb-3">
          <h2 className="text-xl font-black flex gap-2"><Package /> Products</h2>
          <button onClick={() => open()} className="bg-orange-500 text-white rounded-xl px-4 py-2 font-bold flex gap-2"><Plus size={16} /> Add</button>
        </div>

        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Product</th><th>Price</th><th>Stock</th><th></th></tr></thead>
            <tbody>{products.map((p) => <tr key={p.id} className="border-t"><td className="p-3 flex items-center gap-3"><img src={p.image || p.images?.[0]} className="w-10 h-10 rounded-lg object-cover" /><b>{p.name}</b></td><td className="text-center">৳{Number(p.price).toLocaleString()}</td><td className="text-center">{p.stock}</td><td className="p-3 text-right"><button onClick={() => open(p)} className="text-blue-600 p-2"><Edit2 size={16} /></button><button onClick={() => del(p.id)} className="text-red-500 p-2"><Trash2 size={16} /></button></td></tr>)}</tbody>
          </table>
        </div>
        <Link to="/" className="block text-center mt-5 text-gray-400">Back to store</Link>
      </main>

      {modal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto"><div className="flex justify-between mb-3"><h3 className="font-black">Product</h3><button onClick={() => setModal(false)}><X /></button></div><div className="grid sm:grid-cols-2 gap-3"><input className="border rounded-xl p-3 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="border rounded-xl p-3 text-sm" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><ImageUploader value={form.image} token={getToken('seller')} onChange={(url) => setForm({ ...form, image: url })} />
      <input className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Or paste Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /><select className="border rounded-xl p-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select><input className="border rounded-xl p-3 text-sm" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /><input className="border rounded-xl p-3 text-sm" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /><textarea className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><button onClick={save} className="mt-4 w-full bg-orange-500 text-white rounded-xl py-3 font-bold">Save Product</button></div></div>}
    </div>
  );
}
