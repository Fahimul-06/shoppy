import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, Shield, UserCircle2 } from 'lucide-react';
import { api, setSession } from '../../lib/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('Qwertyuiop09');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post<{ token: string; user: any }>('/admin/login', { email, phone: email, password });
      setSession('admin', res.token, res.user);
      navigate('/admin');
    } catch (e) { setError(e instanceof Error ? e.message : 'Admin login failed'); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl">
      <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4"><Shield className="text-white" /></div>
      <h1 className="text-2xl font-black text-gray-900">Admin Login</h1>
      <p className="text-sm text-gray-500 mb-6">Owner admins can login with email. Employees can login with phone and password.</p>
      <div className="space-y-3">
        <div className="relative"><UserCircle2 size={16} className="absolute left-3.5 top-3.5 text-gray-400"/><input className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email or employee phone" /></div>
        <div className="relative"><Lock size={16} className="absolute left-3.5 top-3.5 text-gray-400"/><input className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" /></div>
        {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
        <button onClick={login} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">{loading && <Loader2 className="animate-spin" size={16}/>} Login</button>
        <Link to="/" className="text-sm text-gray-400 hover:text-blue-600 flex items-center justify-center gap-1"><ArrowLeft size={14}/> Back to store</Link>
      </div>
    </div>
  </div>;
}
