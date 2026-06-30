import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Gift, Heart, Loader2, LogOut, Mail, Package, Phone, RotateCcw, ShieldX, TicketPercent, User } from 'lucide-react';
import { api, clearSession, getSessionUser, getToken, setSession } from '../lib/api';
import PasswordOtpPanel from '../components/forms/PasswordOtpPanel';
import PhoneOtpPanel from '../components/forms/PhoneOtpPanel';
import EmailOtpPanel from '../components/forms/EmailOtpPanel';
import ImageUploader from '../components/forms/ImageUploader';
import AddressManager from '../components/forms/AddressManager';

type AuthUser = { id: string; fullName?: string; email: string; phone?: string; profilePhoto?: string; role?: string; addresses?: any[] };

const profileLinks = [
  { to: '/orders', label: 'My Orders', icon: Package },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/coupons', label: 'Vouchers / Coupons', icon: TicketPercent },
  { to: '/returns', label: 'Returns', icon: RotateCcw },
  { to: '/cancellations', label: 'Cancellations', icon: ShieldX },
];

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(getSessionUser<AuthUser>('user'));
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || '', profilePhoto: user?.profilePhoto || '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const updateUserState = (updated: AuthUser) => {
    setSession('user', getToken('user') || '', updated);
    setUser(updated);
    setProfileForm({ fullName: updated.fullName || '', profilePhoto: updated.profilePhoto || '' });
  };

  useEffect(() => {
    const token = getToken('user');
    if (!token) return;
    api.get<{ user: AuthUser }>('/auth/me', token)
      .then(({ user }) => updateUserState(user))
      .catch(() => { clearSession('user'); setUser(null); });
  }, []);

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
      const res = await api.put<{ user: AuthUser }>('/auth/profile', { fullName: profileForm.fullName, profilePhoto: profileForm.profilePhoto }, getToken('user'));
      updateUserState(res.user);
      setMsg('Profile updated');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Update failed'); }
    finally { setLoading(false); }
  };

  if (user) {
    return <div className="min-h-screen bg-gray-50 py-8 px-4"><div className="max-w-6xl mx-auto">
      <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to shopping</Link>
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-fit">
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center font-black text-xl">
                {profileForm.profilePhoto ? <img src={profileForm.profilePhoto} className="w-full h-full object-cover"/> : (user.fullName || user.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0"><h1 className="font-extrabold truncate">{user.fullName || 'Customer'}</h1><p className="text-orange-100 text-xs truncate">{user.email}</p>{user.phone && <p className="text-orange-100 text-xs">{user.phone}</p>}</div>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            <Link to="/account" className="flex items-center gap-3 px-3 py-3 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm"><User size={17}/> Profile</Link>
            {profileLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-sm"><Icon size={17}/> {label}</Link>)}
          </nav>
          <button onClick={() => { clearSession('user'); setUser(null); }} className="m-3 w-[calc(100%-1.5rem)] border border-red-100 text-red-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"><LogOut size={15}/> Sign Out</button>
        </aside>

        <main className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-xl font-black text-gray-900 mb-4">Profile Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <ImageUploader value={profileForm.profilePhoto} onChange={(url)=>setProfileForm({...profileForm, profilePhoto: url})} token={getToken('user')} label="Profile photo" helperText="Drag & drop, upload, or capture a profile photo" />
              <div className="sm:col-span-2"><label className="text-sm font-bold text-gray-700">Full name</label><input className="mt-1 w-full border rounded-xl px-4 py-3 text-sm" placeholder="Full name" value={profileForm.fullName} onChange={(e)=>setProfileForm({...profileForm,fullName:e.target.value})}/></div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm"><p className="text-gray-500">Email</p><p className="font-bold text-gray-800">{user.email}</p></div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm"><p className="text-gray-500">Phone</p><p className="font-bold text-gray-800">{user.phone || 'Not added'}</p></div>
              {msg && <p className="sm:col-span-2 text-sm text-gray-600">{msg}</p>}
              <button onClick={saveProfile} disabled={loading} className="sm:col-span-2 bg-orange-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={15}/> : <Check size={15}/>} Save Profile</button>
            </div>
          </section>

          <AddressManager token={getToken('user')} user={user} onChanged={updateUserState} />

          <div className="grid lg:grid-cols-3 gap-5">
            <PhoneOtpPanel role="user" basePath="/auth" token={getToken('user')} currentPhone={user.phone} onChanged={updateUserState} />
            <EmailOtpPanel role="user" basePath="/auth" token={getToken('user')} currentEmail={user.email} onChanged={updateUserState} />
            <PasswordOtpPanel role="user" basePath="/auth" token={getToken('user')} email={user.email} phone={user.phone}/>
          </div>
        </main>
      </div>
    </div></div>;
  }

  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-md">
    <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{tab === 'login' ? 'Customer Login' : 'Create Account'}</h1><p className="text-sm text-gray-500 mb-5">Login to place orders and manage your profile.</p>
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
