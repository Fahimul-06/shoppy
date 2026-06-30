import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bike, LogOut, MapPin, Phone, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';

const formatAddress = (address?: any) => {
  if (!address) return 'No address';
  return [address.address, address.landmark, address.area, address.district, address.division].filter(Boolean).join(', ') || 'No address';
};

export default function DeliveryOrdersPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(getSessionUser('delivery'));
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const logout = () => { clearSession('delivery'); navigate('/delivery/login'); };

  const load = async () => {
    const token = getToken('delivery');
    if (!token) { navigate('/delivery/login'); return; }
    setLoading(true);
    setError('');
    try {
      const [me, orderRes] = await Promise.all([
        api.get<{ user: any }>('/delivery/me', token),
        api.get<{ orders: any[] }>('/delivery/orders', token),
      ]);
      setUser(me.user);
      localStorage.setItem('deliveryUser', JSON.stringify(me.user));
      setOrders(orderRes.orders || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load assigned orders.');
      if (/unauthorized|invalid|expired/i.test(err?.message || '')) {
        clearSession('delivery');
        navigate('/delivery/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string) => {
    await api.patch(`/delivery/orders/${id}/status`, { status: 'delivered' }, getToken('delivery'));
    await load();
  };

  return <div className="min-h-screen bg-gray-100">
    <header className="bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2"><Bike size={22}/> Delivery Orders</h1>
          <p className="text-xs text-slate-300">{user?.fullName} • ID: {user?.deliveryCode || '------'} • {user?.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/delivery')} className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold flex gap-2 items-center"><ArrowLeft size={15}/> Dashboard</button>
          <button onClick={logout} className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold flex gap-2 items-center"><LogOut size={15}/> Logout</button>
        </div>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-bold">{error}</div>}
      {loading ? <div className="bg-white border rounded-2xl p-6 text-sm text-gray-500">Loading assigned orders...</div> : <div className="space-y-4">{orders.map((o)=> {
        const a = o.shippingAddress || {};
        return <div key={o.id} className="bg-white border rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
            <div>
              <h2 className="font-black text-lg">{o.orderNumber}</h2>
              <p className="text-xs text-gray-500">Assigned: {o.assignedToDeliveryAt ? new Date(o.assignedToDeliveryAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-2xl font-black text-blue-700">৳{Number(o.totalAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Payment: {o.paymentMethod || 'N/A'} • {o.paymentStatus}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <h3 className="font-black mb-2 flex items-center gap-2"><MapPin size={16}/> Delivery Address</h3>
              <p className="text-sm font-semibold">{formatAddress(a)}</p>
              {a.landmark && <p className="text-xs text-gray-600 mt-1">Landmark: {a.landmark}</p>}
              {a.latitude && a.longitude && <a className="text-xs font-black text-blue-700 mt-2 inline-block" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer">Open pinned location</a>}
            </div>
            <div className="rounded-xl bg-gray-50 border p-4">
              <h3 className="font-black mb-2 flex items-center gap-2"><User size={16}/> Customer</h3>
              <p className="text-sm"><b>Name:</b> {a.name || o.customer?.fullName || 'N/A'}</p>
              <p className="text-sm flex items-center gap-1"><Phone size={14}/><b>Phone:</b> {a.phone || o.customer?.phone || 'N/A'}</p>
              <p className="text-sm"><b>Amount:</b> ৳{Number(o.totalAmount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm">
            <b>Total items:</b> {Number(o.itemCount || 0).toLocaleString()} <span className="text-gray-500">(product names are hidden for delivery staff)</span>
          </div>
          <div className="mt-4 flex gap-2">
            {o.status !== 'delivered' ? <button onClick={()=>updateStatus(o.id)} className="px-4 py-2 rounded-xl bg-green-600 text-white font-black text-sm">Mark Delivered</button> : <span className="px-4 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 font-black text-sm">Delivered</span>}
          </div>
        </div>})}
        {!orders.length && <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">No shipped assigned orders yet.</div>}
      </div>}
    </main>
  </div>;
}
