import React, { useEffect, useState } from 'react';
import { Bike, LogOut, MapPin, Package, Phone, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';

const formatAddress = (address?: any) => {
  if (!address) return 'No address';
  return [address.address, address.landmark, address.area, address.district, address.division].filter(Boolean).join(', ') || 'No address';
};

export default function DeliveryDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(getSessionUser('delivery'));
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const logout = () => { clearSession('delivery'); navigate('/delivery/login'); };
  const load = async () => {
    const token = getToken('delivery');
    if (!token) { navigate('/delivery/login'); return; }
    setLoading(true);
    try {
      const [me, orderRes] = await Promise.all([api.get<{ user: any }>('/delivery/me', token), api.get<{ orders: any[] }>('/delivery/orders', token)]);
      setUser(me.user); localStorage.setItem('deliveryUser', JSON.stringify(me.user)); setOrders(orderRes.orders || []);
    } catch {
      clearSession('delivery'); navigate('/delivery/login');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/delivery/orders/${id}/status`, { status }, getToken('delivery'));
    await load();
  };

  return <div className="min-h-screen bg-gray-100">
    <header className="bg-slate-950 text-white"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between"><div><h1 className="text-xl font-black flex items-center gap-2"><Bike size={22}/> Delivery Dashboard</h1><p className="text-xs text-slate-300">{user?.fullName} • {user?.phone}</p></div><button onClick={logout} className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold flex gap-2 items-center"><LogOut size={15}/> Logout</button></div></header>
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white border rounded-2xl p-5 mb-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Assigned Orders</p><p className="text-3xl font-black">{orders.length}</p></div><Package className="text-blue-600" size={36}/></div>
      {loading ? <div className="bg-white border rounded-2xl p-6 text-sm text-gray-500">Loading assigned orders...</div> : <div className="space-y-4">{orders.map((o)=> {
        const a = o.shippingAddress || {};
        return <div key={o.id} className="bg-white border rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3"><div><h2 className="font-black text-lg">{o.orderNumber}</h2><p className="text-xs text-gray-500">Assigned: {o.assignedToDeliveryAt ? new Date(o.assignedToDeliveryAt).toLocaleString() : 'N/A'}</p></div><div className="text-left md:text-right"><p className="text-2xl font-black text-blue-700">৳{Number(o.totalAmount || 0).toLocaleString()}</p><p className="text-xs text-gray-500">Payment: {o.paymentMethod || 'N/A'} • {o.paymentStatus}</p></div></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4"><h3 className="font-black mb-2 flex items-center gap-2"><MapPin size={16}/> Delivery Address</h3><p className="text-sm font-semibold">{formatAddress(a)}</p>{a.landmark && <p className="text-xs text-gray-600 mt-1">Landmark: {a.landmark}</p>}{a.latitude && a.longitude && <a className="text-xs font-black text-blue-700 mt-2 inline-block" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer">Open pinned location</a>}</div>
            <div className="rounded-xl bg-gray-50 border p-4"><h3 className="font-black mb-2 flex items-center gap-2"><User size={16}/> Customer</h3><p className="text-sm"><b>Name:</b> {a.name || o.customer?.fullName || 'N/A'}</p><p className="text-sm flex items-center gap-1"><Phone size={14}/><b>Phone:</b> {a.phone || o.customer?.phone || 'N/A'}</p><p className="text-sm"><b>Amount:</b> ৳{Number(o.totalAmount || 0).toLocaleString()}</p></div>
          </div>
          <div className="mt-4"><h3 className="font-black mb-2">Products</h3><div className="space-y-2">{(o.items || []).map((item:any)=> <div key={item.id} className="border rounded-xl p-3 flex justify-between gap-3 text-sm"><div><b>{item.product?.name || 'Product'}</b><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div><b>৳{Number(item.totalPrice || 0).toLocaleString()}</b></div>)}</div></div>
          <div className="mt-4 flex gap-2"><button onClick={()=>updateStatus(o.id, 'shipped')} className="px-4 py-2 rounded-xl border font-black text-sm">Mark Shipped</button><button onClick={()=>updateStatus(o.id, 'delivered')} className="px-4 py-2 rounded-xl bg-green-600 text-white font-black text-sm">Mark Delivered</button></div>
        </div>})}{!orders.length && <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">No assigned orders yet.</div>}</div>}
    </main>
  </div>;
}
