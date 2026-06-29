import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Bike, ExternalLink, Headphones, LogOut, MapPin, MessageCircle, Package, Phone, Send, User, Video, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';

const formatAddress = (address?: any) => {
  if (!address) return 'No address';
  return [address.address, address.landmark, address.area, address.district, address.division].filter(Boolean).join(', ') || 'No address';
};

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

  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportText, setSupportText] = useState('');
  const [supportError, setSupportError] = useState('');
  const [startingCall, setStartingCall] = useState(false);

  const logout = () => { clearSession('delivery'); navigate('/delivery/login'); };

  const loadSupport = async () => {
    const token = getToken('delivery');
    if (!token) return;
    const res = await api.get<{ messages: any[] }>('/delivery/support', token);
    setSupportMessages(res.messages || []);
  };

  const load = async (silent = false) => {
    const token = getToken('delivery');
    if (!token) { navigate('/delivery/login'); return; }
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
      loadSupport().catch(() => {});
    } catch {
      clearSession('delivery'); navigate('/delivery/login');
    } finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 10000);
    return () => window.clearInterval(timer);
  }, [soundEnabled]);

  const enableSound = () => {
    setSoundEnabled(true);
    playLoudAlert();
    setNewOrderNotice('High sound notification enabled.');
  };

  const updateStatus = async (id: string) => {
    await api.patch(`/delivery/orders/${id}/status`, { status: 'delivered' }, getToken('delivery'));
    await load();
  };


  const startVirtualCall = async () => {
    if (startingCall) return;
    setStartingCall(true);
    setSupportError('');
    try {
      const res = await api.post<{ message: any; callUrl: string }>('/delivery/support/call', {}, getToken('delivery'));
      setSupportMessages((prev) => [...prev, res.message]);
      if (res.callUrl) window.open(`${res.callUrl}?role=delivery`, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'ইন্টারনেট কল শুরু করা যায়নি');
    } finally {
      setStartingCall(false);
    }
  };

  const sendSupport = async () => {
    const clean = supportText.trim();
    if (!clean) return;
    setSupportText('');
    setSupportError('');
    try {
      const res = await api.post<{ message: any }>('/delivery/support', { message: clean, language: 'bn' }, getToken('delivery'));
      setSupportMessages((prev) => [...prev, res.message]);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'মেসেজ পাঠানো যায়নি');
      setSupportText(clean);
    }
  };

  return <div className="min-h-screen bg-gray-100">
    <header className="bg-slate-950 text-white"><div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between"><div><h1 className="text-xl font-black flex items-center gap-2"><Bike size={22}/> Delivery Dashboard</h1><p className="text-xs text-slate-300">{user?.fullName} • ID: {user?.deliveryCode || '------'} • {user?.phone}</p></div><button onClick={logout} className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold flex gap-2 items-center"><LogOut size={15}/> Logout</button></div></header>
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="grid md:grid-cols-[1fr_auto] gap-3">
        <div className="bg-white border rounded-2xl p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Assigned Shipped Orders</p><p className="text-3xl font-black">{orders.filter((o)=>o.status === 'shipped').length}</p></div><Package className="text-blue-600" size={36}/></div>
        <button onClick={enableSound} className={`rounded-2xl px-5 py-4 font-black flex items-center justify-center gap-2 ${soundEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}><Volume2 size={18}/>{soundEnabled ? 'High Sound On' : 'Enable High Sound'}</button>
      </div>
      {newOrderNotice && <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 font-black flex items-center gap-2"><BellRing size={18}/>{newOrderNotice}</div>}

      {loading ? <div className="bg-white border rounded-2xl p-6 text-sm text-gray-500">Loading assigned orders...</div> : <div className="space-y-4">{orders.map((o)=> {
        const a = o.shippingAddress || {};
        return <div key={o.id} className="bg-white border rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3"><div><h2 className="font-black text-lg">{o.orderNumber}</h2><p className="text-xs text-gray-500">Assigned: {o.assignedToDeliveryAt ? new Date(o.assignedToDeliveryAt).toLocaleString() : 'N/A'}</p></div><div className="text-left md:text-right"><p className="text-2xl font-black text-blue-700">৳{Number(o.totalAmount || 0).toLocaleString()}</p><p className="text-xs text-gray-500">Payment: {o.paymentMethod || 'N/A'} • {o.paymentStatus}</p></div></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4"><h3 className="font-black mb-2 flex items-center gap-2"><MapPin size={16}/> Delivery Address</h3><p className="text-sm font-semibold">{formatAddress(a)}</p>{a.landmark && <p className="text-xs text-gray-600 mt-1">Landmark: {a.landmark}</p>}{a.latitude && a.longitude && <a className="text-xs font-black text-blue-700 mt-2 inline-block" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer">Open pinned location</a>}</div>
            <div className="rounded-xl bg-gray-50 border p-4"><h3 className="font-black mb-2 flex items-center gap-2"><User size={16}/> Customer</h3><p className="text-sm"><b>Name:</b> {a.name || o.customer?.fullName || 'N/A'}</p><p className="text-sm flex items-center gap-1"><Phone size={14}/><b>Phone:</b> {a.phone || o.customer?.phone || 'N/A'}</p><p className="text-sm"><b>Amount:</b> ৳{Number(o.totalAmount || 0).toLocaleString()}</p></div>
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm"><b>Total items:</b> {Number(o.itemCount || 0).toLocaleString()} <span className="text-gray-500">(product names are hidden for delivery staff)</span></div>
          <div className="mt-4 flex gap-2">{o.status !== 'delivered' ? <button onClick={()=>updateStatus(o.id)} className="px-4 py-2 rounded-xl bg-green-600 text-white font-black text-sm">Mark Delivered</button> : <span className="px-4 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 font-black text-sm">Delivered</span>}</div>
        </div>})}{!orders.length && <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">No shipped assigned orders yet.</div>}</div>}

      <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h2 className="font-black flex items-center gap-2"><Headphones size={18}/> Customer Care Support</h2><p className="text-xs text-gray-500">বাংলায় চ্যাট করুন অথবা ইন্টারনেট কল করুন।</p></div><button onClick={startVirtualCall} disabled={startingCall} className="bg-green-600 disabled:bg-gray-300 text-white rounded-xl px-4 py-2 font-black flex items-center justify-center gap-2 text-sm"><Video size={16}/>{startingCall ? 'Starting...' : 'Internet Call'}</button></div>
        <div className="h-72 overflow-y-auto p-4 bg-gray-50 space-y-2">
          {supportMessages.length === 0 ? <p className="text-center text-gray-500 mt-20 text-sm">No support messages yet. বাংলায় মেসেজ লিখুন।</p> : supportMessages.map((m)=>{
            const isCall = m.messageType === 'call';
            return <div key={m.id || m._id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'delivery' ? 'ml-auto bg-blue-600 text-white' : 'bg-white border text-gray-800'}`}>
              {isCall ? <div className="space-y-2"><p className="font-black flex items-center gap-2"><Video size={15}/> Internet call request</p><p>{m.message}</p>{m.callUrl && <a href={`${m.callUrl}?role=delivery`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white text-blue-700 px-3 py-1 font-black text-xs">Open call <ExternalLink size={12}/></a>}<p className="text-xs opacity-80">Status: {m.callStatus || 'ringing'}</p></div> : <p>{m.message}</p>}
              <p className={`text-[10px] mt-1 ${m.senderType === 'delivery' ? 'text-blue-100' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
            </div>})}
        </div>
        {supportError && <p className="px-4 pt-2 text-xs text-red-600 font-bold">{supportError}</p>}
        <div className="p-3 border-t flex gap-2"><input value={supportText} onChange={(e)=>setSupportText(e.target.value)} onKeyDown={(e)=>{ if (e.key === 'Enter') sendSupport(); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="বাংলায় লিখুন... / Write message..."/><button onClick={sendSupport} disabled={!supportText.trim()} className="bg-blue-600 disabled:bg-gray-300 text-white rounded-xl px-4 font-black flex items-center gap-2"><Send size={16}/> Send</button></div>
      </section>
    </main>
  </div>;
}
