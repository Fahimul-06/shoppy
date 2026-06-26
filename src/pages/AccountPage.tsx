import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, LogOut, Mail, Package, Phone, User } from 'lucide-react';
import { api, clearSession, getSessionUser, getToken, setSession } from '../lib/api';
import { fetchUserOrders } from '../lib/db';

type AuthUser = { id: string; fullName?: string; email: string; phone?: string; role?: string };

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(getSessionUser<AuthUser>('user'));
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = getToken('user');
    if (!token) return;
    api.get<{ user: AuthUser }>('/auth/me', token)
      .then(({ user }) => { setUser(user); localStorage.setItem('userUser', JSON.stringify(user)); })
      .catch(() => { clearSession('user'); setUser(null); });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUserOrders().then(setOrders).catch(() => setOrders([]));
  }, [user]);

  const login = async () => {
    setLoading(true); setMsg('');
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email: form.email, password: form.password });
      if (res.user.role === 'admin') throw new Error('Admin users should login from admin panel');
      setSession('user', res.token, res.user); setUser(res.user);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  const register = async () => {
    if (form.password !== form.confirm) { setMsg('Passwords do not match'); return; }
    setLoading(true); setMsg('');
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', { name: form.name, email: form.email, phone: form.phone, password: form.password });
      setSession('user', res.token, res.user); setUser(res.user);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Registration failed'); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true); setMsg('');
    try {
      const res = await api.put<{ user: AuthUser }>('/auth/profile', { fullName: form.name || user.fullName, phone: form.phone || user.phone }, getToken('user'));
      setSession('user', getToken('user') || '', res.user); setUser(res.user); setMsg('Profile updated');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Update failed'); }
    finally { setLoading(false); }
  };

  if (user) {
    return <div className="min-h-screen bg-gray-50 py-8 px-4"><div className="max-w-3xl mx-auto">
      <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to shopping</Link>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-6 text-white">
          <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl">{(user.fullName || user.email)[0].toUpperCase()}</div>
          <div><h1 className="text-xl font-extrabold">{user.fullName || 'Customer'}</h1><p className="text-orange-100 text-sm">{user.email}</p>{user.phone && <p className="text-orange-100 text-xs">{user.phone}</p>}</div></div>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div><h2 className="font-bold text-gray-800 mb-3 flex gap-2 items-center"><Package size={17}/> My Orders</h2>
            {orders.length === 0 ? <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">No orders yet.</p> : <div className="space-y-3">{orders.map((o) => <div key={o.id} className="bg-gray-50 rounded-xl p-4 flex justify-between"><div><p className="font-bold text-sm">{o.orderNumber}</p><p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-bold">৳{Number(o.totalAmount).toLocaleString()}</p><p className="text-xs capitalize text-gray-500">{o.status}</p></div></div>)}</div>}
          </div>
          <div><h2 className="font-bold text-gray-800 mb-3 flex gap-2 items-center"><User size={17}/> Edit Profile</h2>
            <div className="space-y-3"><input className="w-full border rounded-xl px-4 py-3 text-sm" placeholder="Full name" value={form.name || user.fullName || ''} onChange={(e)=>setForm({...form,name:e.target.value})}/>
            <input className="w-full border rounded-xl px-4 py-3 text-sm" placeholder="Phone" value={form.phone || user.phone || ''} onChange={(e)=>setForm({...form,phone:e.target.value})}/>
            {msg && <p className="text-sm text-gray-600">{msg}</p>}<button onClick={saveProfile} disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={15}/> : <Check size={15}/>} Save</button></div>
          </div>
        </div>
      </div>
      <button onClick={() => { clearSession('user'); setUser(null); }} className="mt-4 w-full border border-red-100 text-red-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"><LogOut size={15}/> Sign Out</button>
    </div></div>;
  }

  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-md">
    <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{tab === 'login' ? 'Customer Login' : 'Create Account'}</h1><p className="text-sm text-gray-500 mb-5">Login to place orders and view your order history.</p>
    <div className="flex bg-gray-100 rounded-xl p-1 mb-4"><button onClick={()=>setTab('login')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab==='login'?'bg-white shadow text-orange-500':'text-gray-500'}`}>Login</button><button onClick={()=>setTab('register')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab==='register'?'bg-white shadow text-orange-500':'text-gray-500'}`}>Register</button></div>
    <div className="space-y-3">{tab==='register' && <><div className="relative"><User size={15} className="absolute left-3 top-3.5 text-gray-400"/><input className="w-full pl-9 border rounded-xl px-4 py-3 text-sm" placeholder="Full name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div><div className="relative"><Phone size={15} className="absolute left-3 top-3.5 text-gray-400"/><input className="w-full pl-9 border rounded-xl px-4 py-3 text-sm" placeholder="Phone" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></div></>}
      <div className="relative"><Mail size={15} className="absolute left-3 top-3.5 text-gray-400"/><input className="w-full pl-9 border rounded-xl px-4 py-3 text-sm" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></div>
      <input className="w-full border rounded-xl px-4 py-3 text-sm" type="password" placeholder="Password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/>
      {tab==='register' && <input className="w-full border rounded-xl px-4 py-3 text-sm" type="password" placeholder="Confirm password" value={form.confirm} onChange={(e)=>setForm({...form,confirm:e.target.value})}/>} {msg && <p className="text-sm text-red-500">{msg}</p>}
      <button onClick={tab==='login'?login:register} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">{loading && <Loader2 className="animate-spin" size={15}/>} {tab==='login'?'Login':'Register'}</button>
      <Link to="/" className="block text-center text-sm text-gray-400 hover:text-orange-500">Back to shopping</Link>
    </div>
  </div></div>;
}
