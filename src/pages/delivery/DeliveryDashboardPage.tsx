import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Bike, Headphones, LogOut, Package, ShoppingBag, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';
import { createRealtimeSocket } from '../../lib/socket';
import type { Socket } from 'socket.io-client';
import { DELIVERY_LOGIN_PATH, DELIVERY_ORDERS_PATH, DELIVERY_SUPPORT_PATH } from '../../lib/adminPortal';

function playLoudAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.gain.value = 0.75;
    gain.connect(ctx.destination);
    [0, 0.28, 0.56].forEach((delay) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 880;
      osc.connect(gain);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
    window.setTimeout(() => ctx.close?.(), 1200);
  } catch {
    // Browser may block sound until user taps Enable Sound.
  }
}

export default function DeliveryDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(getSessionUser('delivery'));
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newOrderNotice, setNewOrderNotice] = useState('');
  const knownOrderIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);

  const logout = () => { clearSession('delivery'); navigate(DELIVERY_LOGIN_PATH); };

  const load = async (silent = false) => {
    const token = getToken('delivery');
    if (!token) { navigate(DELIVERY_LOGIN_PATH); return; }
    if (!silent) setLoading(true);
    try {
      const [me, orderRes] = await Promise.all([
        api.get<{ user: any }>('/delivery/me', token),
        api.get<{ orders: any[] }>('/delivery/orders', token),
      ]);
      setUser(me.user);
      localStorage.setItem('deliveryUser', JSON.stringify(me.user));
      const incoming = orderRes.orders || [];
      const incomingIds = new Set(incoming.map((o: any) => String(o.id)));
      const newIds = incoming.filter((o: any) => !knownOrderIds.current.has(String(o.id)) && o.status === 'shipped');
      if (firstLoadDone.current && newIds.length > 0) {
        setNewOrderNotice(`${newIds.length} new assigned order(s) received.`);
        if (soundEnabled) playLoudAlert();
      }
      knownOrderIds.current = incomingIds;
      firstLoadDone.current = true;
      setOrders(incoming);
    } catch {
      clearSession('delivery'); navigate(DELIVERY_LOGIN_PATH);
    } finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, [soundEnabled]);

  useEffect(() => {
    const token = getToken('delivery');
    if (!token) return;
    const socket = createRealtimeSocket('delivery');
    socket.on('connect', () => socket.emit('delivery-dashboard:join', {}));
    socket.on('delivery:orders-assigned', (payload: any) => {
      setNewOrderNotice(payload?.message || 'New assigned order received.');
      if (soundEnabled) playLoudAlert();
      load(true).catch(() => {});
    });
    return () => { socket.disconnect(); };
  }, [soundEnabled]);

  const enableSound = () => {
    setSoundEnabled(true);
    playLoudAlert();
    setNewOrderNotice('High sound notification enabled.');
  };





  return <div className="min-h-screen bg-gray-100">
    <header className="bg-slate-950 text-white"><div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between"><div><h1 className="text-xl font-black flex items-center gap-2"><Bike size={22}/> Delivery Dashboard</h1><p className="text-xs text-slate-300">{user?.fullName} • ID: {user?.deliveryCode || '------'} • {user?.phone}</p></div><button onClick={logout} className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold flex gap-2 items-center"><LogOut size={15}/> Logout</button></div></header>
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="grid md:grid-cols-[1fr_auto] gap-3">
        <div className="bg-white border rounded-2xl p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Assigned Shipped Orders</p><p className="text-3xl font-black">{orders.filter((o)=>o.status === 'shipped').length}</p></div><Package className="text-blue-600" size={36}/></div>
        <button onClick={enableSound} className={`rounded-2xl px-5 py-4 font-black flex items-center justify-center gap-2 ${soundEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}><Volume2 size={18}/>{soundEnabled ? 'High Sound On' : 'Enable High Sound'}</button>
      </div>
      {newOrderNotice && <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 font-black flex items-center gap-2"><BellRing size={18}/>{newOrderNotice}</div>}

      {loading && <div className="bg-white border rounded-2xl p-4 text-sm text-gray-500">Loading dashboard...</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <button onClick={() => navigate(DELIVERY_ORDERS_PATH)} className="bg-white border rounded-2xl p-5 text-left hover:border-green-300 hover:shadow-md transition flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-green-600 text-white flex items-center justify-center"><ShoppingBag size={26}/></div>
            <div>
              <h2 className="font-black text-lg">Orders</h2>
              <p className="text-sm text-gray-500">Assigned shipped orders দেখুন এবং delivered করুন।</p>
            </div>
          </div>
          <span className="bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-black">Open</span>
        </button>

      <button onClick={() => navigate(DELIVERY_SUPPORT_PATH)} className="bg-white border rounded-2xl p-5 text-left hover:border-blue-300 hover:shadow-md transition flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><Headphones size={26}/></div>
          <div>
            <h2 className="font-black text-lg">Customer Care Support</h2>
            <p className="text-sm text-gray-500">বাংলায় চ্যাট করুন অথবা ইন্টারনেট কল করুন।</p>
          </div>
        </div>
        <span className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-black">Open</span>
      </button>
      </div>
    </main>
  </div>;
}
