import React, { useState } from 'react';
import { Bike, Lock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../../lib/api';

export default function DeliveryLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post<{ token: string; user: any }>('/delivery/login', { phone, password });
      setSession('delivery', r.token, r.user);
      navigate('/delivery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-md space-y-5">
      <div className="text-center"><div className="mx-auto h-14 w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center"><Bike size={28}/></div><h1 className="text-2xl font-black mt-3">Delivery Login</h1><p className="text-sm text-gray-500">Login using admin-created phone and password</p></div>
      <label className="block text-sm font-bold text-gray-700">Phone<div className="mt-1 flex items-center border rounded-xl px-3"><Phone size={16} className="text-gray-400"/><input value={phone} onChange={(e)=>setPhone(e.target.value)} className="flex-1 py-3 px-2 outline-none" placeholder="01XXXXXXXXX" required /></div></label>
      <label className="block text-sm font-bold text-gray-700">Password<div className="mt-1 flex items-center border rounded-xl px-3"><Lock size={16} className="text-gray-400"/><input value={password} onChange={(e)=>setPassword(e.target.value)} className="flex-1 py-3 px-2 outline-none" type="password" required /></div></label>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      <button disabled={loading} className="w-full bg-blue-600 text-white rounded-xl py-3 font-black disabled:opacity-60">{loading ? 'Logging in...' : 'Login'}</button>
    </form>
  </div>;
}
