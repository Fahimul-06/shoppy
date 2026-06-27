import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Edit2, Home, Loader2, LogOut, MessageCircle, Package, Plus, RotateCcw, ShieldX, ShoppingBag, Store, Trash2, User, X } from 'lucide-react';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';
import { categories } from '../../data/categories';
import ImageUploader from '../../components/forms/ImageUploader';
import PasswordOtpPanel from '../../components/forms/PasswordOtpPanel';
import PhoneOtpPanel from '../../components/forms/PhoneOtpPanel';
import CategoryDropdowns from '../../components/forms/CategoryDropdowns';
import AddressManager from '../../components/forms/AddressManager';

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
  description: '',
  features: '',
  active: true,
};

const emptyProfile = {
  name: '',
  phone: '',
  shopName: '',
  shopLogo: '',
  shopAddress: '',
  businessType: '',
  nidNumber: '',
  tinNumber: '',
  bankName: '',
  bankAccount: '',
};

const sectionFromPath = (pathname: string) => {
  if (pathname.endsWith('/profile')) return 'profile';
  if (pathname.endsWith('/products')) return 'products';
  if (pathname.endsWith('/orders')) return 'orders';
  if (pathname.endsWith('/returns')) return 'returns';
  if (pathname.endsWith('/cancellations')) return 'cancellations';
  return 'home';
};

export default function SellerDashboardPage() {
  const nav = useNavigate();
  const location = useLocation();
  const section = sectionFromPath(location.pathname);
  const [seller, setSeller] = useState<any>(getSessionUser('seller'));
  const [profileForm, setProfileForm] = useState<any>({ ...emptyProfile, ...(getSessionUser('seller') || {}) });
  const [products, setProducts] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [chat, setChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const load = async () => {
    const [productRes, returnRes, cancellationRes, orderRes] = await Promise.all([
      api.get<{ products: any[] }>('/seller/products', getToken('seller')),
      api.get<{ returns: any[] }>('/seller/returns', getToken('seller')).catch(() => ({ returns: [] })),
      api.get<{ cancellations: any[] }>('/seller/cancellations', getToken('seller')).catch(() => ({ cancellations: [] })),
      api.get<{ orders: any[] }>('/seller/orders', getToken('seller')).catch(() => ({ orders: [] })),
    ]);
    setProducts(productRes.products || []);
    setReturns(returnRes.returns || []);
    setCancellations(cancellationRes.cancellations || []);
    setSellerOrders(orderRes.orders || []);
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
    setForm(p ? { ...EMPTY, ...p, image: p.image || p.images?.[0] || '', subcategory: p.subcategory || p.subCategory || '', childCategory: p.childCategory || p.subSubCategory || '', features: (p.features || []).join('\n') } : { ...EMPTY });
    setModal(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      stock: Number(form.stock),
      image: form.image,
      images: [form.image].filter(Boolean),
      features: String(form.features || '').split('\n').map((x) => x.trim()).filter(Boolean),
      subcategory: form.subcategory || '',
      childCategory: form.childCategory || '',
    };
    if (editing) await api.put(`/seller/products/${editing.id || editing._id}`, payload, getToken('seller'));
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

  const openChat = async (order: any, item: any) => {
    setChat({ order, item });
    setChatText('');
    setChatLoading(true);
    try {
      const res = await api.get<{ messages: any[] }>(`/seller/chats/${order.id || order._id}/${item.id || item._id}`, getToken('seller'));
      setChatMessages(res.messages || []);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open chat');
      setChat(null);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chat || !chatText.trim()) return;
    const text = chatText.trim();
    setChatText('');
    const res = await api.post<{ message: any }>(`/seller/chats/${chat.order.id || chat.order._id}/${chat.item.id || chat.item._id}`, { message: text }, getToken('seller'));
    setChatMessages((prev) => [...prev, res.message]);
  };

  const navItems = [
    { to: '/seller/dashboard', key: 'home', label: 'Home', icon: Home },
    { to: '/seller/dashboard/profile', key: 'profile', label: 'Profile', icon: User },
    { to: '/seller/dashboard/products', key: 'products', label: 'Products', icon: Package },
    { to: '/seller/dashboard/orders', key: 'orders', label: 'Orders', icon: ShoppingBag },
    { to: '/seller/dashboard/returns', key: 'returns', label: 'Returns', icon: RotateCcw },
    { to: '/seller/dashboard/cancellations', key: 'cancellations', label: 'Cancellations', icon: ShieldX },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3 items-center">
            <Store className="text-orange-500" />
            <div>
              <h1 className="font-black">{seller?.shopName || 'Seller Dashboard'}</h1>
              <p className="text-xs text-gray-500 capitalize">Status: {seller?.status || 'pending'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              return (
                <Link key={item.key} to={item.to} className={`shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold border ${active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 hover:bg-orange-50 border-gray-200'}`}>
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
            <button onClick={logout} className="shrink-0 text-red-500 flex gap-2 items-center rounded-xl px-3 py-2 border border-red-100 bg-red-50 text-sm font-bold"><LogOut size={16} /> Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {seller?.status !== 'approved' && <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-4 mb-4 text-sm">Your seller account is not approved yet. You can prepare products, but admin approval is required.</div>}

        {section === 'home' && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Products</p><p className="text-3xl font-black">{products.length}</p></div>
              <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Orders</p><p className="text-3xl font-black">{sellerOrders.length}</p></div>
              <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Returns</p><p className="text-3xl font-black">{returns.length}</p></div>
              <div className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">Cancellations</p><p className="text-3xl font-black">{cancellations.length}</p></div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <Link to="/seller/dashboard/profile" className="bg-white rounded-3xl border p-6 hover:border-orange-300 hover:shadow-sm transition group">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition"><User size={28} /></div>
                <h2 className="font-black text-xl mb-1">Profile</h2>
                <p className="text-sm text-gray-500">Edit seller/shop details, set or change phone using OTP, and change password using OTP.</p>
              </Link>
              <Link to="/seller/dashboard/products" className="bg-white rounded-3xl border p-6 hover:border-orange-300 hover:shadow-sm transition group">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition"><Package size={28} /></div>
                <h2 className="font-black text-xl mb-1">Products</h2>
                <p className="text-sm text-gray-500">Add, edit, upload product photos, update price and stock, or delete products.</p>
              </Link>
              <Link to="/seller/dashboard/orders" className="bg-white rounded-3xl border p-6 hover:border-orange-300 hover:shadow-sm transition group">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition"><ShoppingBag size={28} /></div>
                <h2 className="font-black text-xl mb-1">Orders</h2>
                <p className="text-sm text-gray-500">See orders that contain your products and chat with the customer.</p>
              </Link>
              <Link to="/seller/dashboard/returns" className="bg-white rounded-3xl border p-6 hover:border-orange-300 hover:shadow-sm transition group">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition"><RotateCcw size={28} /></div>
                <h2 className="font-black text-xl mb-1">Returns</h2>
                <p className="text-sm text-gray-500">See return requests for products that belong to your seller account.</p>
              </Link>
              <Link to="/seller/dashboard/cancellations" className="bg-white rounded-3xl border p-6 hover:border-orange-300 hover:shadow-sm transition group">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 group-hover:bg-red-500 group-hover:text-white transition"><ShieldX size={28} /></div>
                <h2 className="font-black text-xl mb-1">Cancellations</h2>
                <p className="text-sm text-gray-500">See ordered products cancelled by customers within 12 hours.</p>
              </Link>
            </div>
          </>
        )}

        {section === 'profile' && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 border">
              <h2 className="font-black text-lg flex items-center gap-2 mb-4"><User size={18}/> Seller Profile</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="border rounded-xl p-3 text-sm" placeholder="Seller name" value={profileForm.name || ''} onChange={(e) => updateProfile('name', e.target.value)} />
                <p className="border rounded-xl p-3 text-sm text-gray-500 bg-gray-50">Phone: <b>{seller?.phone || 'Not added yet'}</b><br/><span className="text-xs">Set or change it with OTP verification.</span></p>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-500 mb-2 block">Shop logo</label>
                  <ImageUploader value={profileForm.shopLogo || ''} token={getToken('seller')} onChange={(url) => updateProfile('shopLogo', url)} />
                </div>
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
            <div className="lg:col-span-2">
              <AddressManager
                token={getToken('seller')}
                user={seller || {}}
                basePath="/seller"
                title="Seller Delivery / Pickup Addresses"
                description="Save your shop, warehouse, pickup, or return address manually or by using device current location."
                onChanged={(updated) => {
                  setSeller(updated);
                  setProfileForm({ ...emptyProfile, ...updated });
                  localStorage.setItem('sellerUser', JSON.stringify(updated));
                }}
              />
            </div>
          </div>
        )}

        {section === 'products' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-xl font-black flex gap-2 items-center"><Package /> Products</h2>
                <p className="text-sm text-gray-500">Manage all products uploaded by this seller account.</p>
              </div>
              <button onClick={() => open()} className="bg-orange-500 text-white rounded-xl px-4 py-2 font-bold flex gap-2"><Plus size={16} /> Add</button>
            </div>

            <div className="bg-white rounded-2xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="p-3 text-left">Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {products.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No products yet. Click Add to upload your first product.</td></tr>}
                  {products.map((p) => <tr key={p.id || p._id} className="border-t"><td className="p-3 flex items-center gap-3"><img src={p.image || p.images?.[0] || 'https://placehold.co/80x80?text=Product'} className="w-10 h-10 rounded-lg object-cover bg-gray-100" /><b>{p.name}</b></td><td className="text-center">৳{Number(p.price || 0).toLocaleString()}</td><td className="text-center">{p.stock}</td><td className="text-center"><span className="text-xs rounded-full bg-gray-100 px-2 py-1">{p.active === false ? 'Hidden' : 'Active'}</span></td><td className="p-3 text-right"><button onClick={() => open(p)} className="text-blue-600 p-2"><Edit2 size={16} /></button><button onClick={() => del(p.id || p._id)} className="text-red-500 p-2"><Trash2 size={16} /></button></td></tr>)}
                </tbody>
              </table>
            </div>
          </>
        )}

        {section === 'orders' && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex gap-2 items-center"><ShoppingBag /> Product Orders</h2>
                <p className="text-sm text-gray-500">Only orders containing your seller products appear here. Open chat to message the customer.</p>
              </div>
            </div>
            {sellerOrders.length === 0 ? <div className="p-8 text-center text-gray-500">No customer orders for your products yet.</div> : (
              <div className="divide-y">
                {sellerOrders.map((order) => (
                  <div key={order.id || order._id} className="p-4">
                    <div className="flex flex-wrap justify-between gap-3 mb-3">
                      <div>
                        <p className="font-black">{order.orderNumber}</p>
                        <p className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</p>
                        <p className="text-xs text-gray-500 mt-1">Customer: {order.user?.name || 'Customer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black">৳{Number(order.sellerSubtotal || 0).toLocaleString()}</p>
                        <p className="text-xs capitalize text-gray-500">{order.status} • {order.paymentStatus}</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {(order.items || []).map((item: any) => (
                        <div key={item.id || item._id} className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-xl p-3">
                          <img src={item.product?.image || item.productSnapshot?.image || 'https://placehold.co/80x80?text=Product'} className="w-12 h-12 rounded-lg object-cover bg-white" />
                          <div className="flex-1 min-w-[180px]"><p className="text-sm font-bold">{item.product?.name || item.productSnapshot?.name}</p><p className="text-xs text-gray-500">Qty: {item.quantity} • ৳{Number(item.totalPrice || 0).toLocaleString()}</p></div>
                          <button onClick={() => openChat(order, item)} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-3 py-2 text-sm font-bold"><MessageCircle size={16}/> Chat customer</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === 'returns' && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex gap-2 items-center"><RotateCcw /> Return Requests</h2>
                <p className="text-sm text-gray-500">Only returns for your seller products appear here. Admin accepts or denies these requests.</p>
              </div>
            </div>
            {returns.length === 0 ? <div className="p-8 text-center text-gray-500">No return requests for your products yet.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="p-3 text-left">Request</th><th>Product</th><th>Customer</th><th>Status</th><th>Admin note</th></tr></thead>
                  <tbody>{returns.map((r) => <tr key={r.id || r._id} className="border-t align-top"><td className="p-3"><b>{r.order?.orderNumber || 'Order'}</b><p className="text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</p><p className="text-xs text-gray-500 mt-1">Reason: {r.reason}</p>{r.details && <p className="text-xs text-gray-500">{r.details}</p>}</td><td className="p-3"><div className="flex items-center gap-2"><img src={r.product?.image || r.product?.images?.[0] || 'https://placehold.co/80x80?text=Product'} className="w-10 h-10 rounded-lg object-cover bg-gray-100"/><div><b>{r.product?.name || 'Product'}</b><p className="text-xs text-gray-500">Qty: {r.quantity}</p></div></div></td><td className="p-3 text-center">{r.user?.name || 'Customer'}</td><td className="p-3 text-center"><span className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold capitalize ${r.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' : r.status === 'denied' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{r.status}</span></td><td className="p-3 text-gray-600">{r.adminNote || 'No note yet'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {section === 'cancellations' && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex gap-2 items-center"><ShieldX /> Product Cancellations</h2>
                <p className="text-sm text-gray-500">Only cancellations for your seller products appear here.</p>
              </div>
            </div>
            {cancellations.length === 0 ? <div className="p-8 text-center text-gray-500">No cancelled seller products yet.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="p-3 text-left">Cancelled product</th><th>Order</th><th>Customer</th><th>Reason</th><th>Status</th><th>Cancelled at</th></tr></thead>
                  <tbody>{cancellations.map((c) => <tr key={c.id || c._id} className="border-t align-top"><td className="p-3"><div className="flex items-center gap-2"><img src={c.product?.image || c.product?.images?.[0] || 'https://placehold.co/80x80?text=Product'} className="w-10 h-10 rounded-lg object-cover bg-gray-100"/><div><b>{c.product?.name || 'Product'}</b><p className="text-xs text-gray-500">Qty: {c.quantity || 1}</p></div></div></td><td className="p-3 text-center"><b>{c.order?.orderNumber || 'Order'}</b><p className="text-xs text-gray-400">{c.order?.createdAt ? new Date(c.order.createdAt).toLocaleString() : ''}</p></td><td className="p-3 text-center">{c.user?.name || 'Customer'}</td><td className="p-3 text-gray-600">{c.reason || '-'}</td><td className="p-3 text-center"><span className="inline-flex px-3 py-1 rounded-full border text-xs font-bold capitalize bg-red-50 text-red-700 border-red-100">{c.status}</span></td><td className="p-3 text-center text-gray-500">{c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : '-'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <Link to="/" className="block text-center mt-5 text-gray-400">Back to store</Link>
      </main>

      {chat && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div><h3 className="font-black flex items-center gap-2"><MessageCircle size={18}/> Chat with {chat.order?.user?.name || 'Customer'}</h3><p className="text-xs text-gray-500">{chat.order?.orderNumber} • {chat.item?.product?.name || chat.item?.productSnapshot?.name}</p></div>
            <button onClick={() => setChat(null)}><X /></button>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-2 bg-gray-50">
            {chatLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div> : chatMessages.length === 0 ? <p className="text-center text-gray-500 text-sm mt-20">No messages yet. Send the first message to the customer.</p> : chatMessages.map((m) => (
              <div key={m.id || m._id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'seller' ? 'ml-auto bg-orange-500 text-white' : 'bg-white border text-gray-700'}`}>
                <p>{m.message}</p><p className={`text-[10px] mt-1 ${m.senderType === 'seller' ? 'text-orange-100' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Write message..." />
            <button onClick={sendChat} className="bg-orange-500 text-white rounded-xl px-4 font-bold">Send</button>
          </div>
        </div>
      </div>}

      {modal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto"><div className="flex justify-between mb-3"><h3 className="font-black">{editing ? 'Edit Product' : 'Add Product'}</h3><button onClick={() => setModal(false)}><X /></button></div><div className="grid sm:grid-cols-2 gap-3"><input className="border rounded-xl p-3 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="border rounded-xl p-3 text-sm" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><input className="border rounded-xl p-3 text-sm" placeholder="Original price" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /><input className="border rounded-xl p-3 text-sm" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /><div className="sm:col-span-2"><ImageUploader value={form.image} token={getToken('seller')} onChange={(url) => setForm({ ...form, image: url })} /></div><input className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Or paste Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /><div className="sm:col-span-2"><CategoryDropdowns category={form.category} subcategory={form.subcategory} childCategory={form.childCategory} onChange={(next) => setForm({ ...form, ...next })} /></div><input className="border rounded-xl p-3 text-sm" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /><textarea className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><textarea className="border rounded-xl p-3 text-sm sm:col-span-2" placeholder="Features, one per line" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div><button onClick={save} className="mt-4 w-full bg-orange-500 text-white rounded-xl py-3 font-bold">Save Product</button></div></div>}
    </div>
  );
}
