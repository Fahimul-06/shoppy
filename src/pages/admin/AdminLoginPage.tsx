import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { login } from '../../lib/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, 'admin');
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50"><Shield size={30} className="text-white" /></div></div>
        <h1 className="text-2xl font-extrabold text-white text-center mb-1">Admin Panel</h1>
        <p className="text-slate-400 text-sm text-center mb-8">MongoDB Administrator Access</p>
        <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-4">
          <div><label className="block text-sm font-semibold text-slate-300 mb-1.5">Email</label><div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-sm text-white" /></div></div>
          <div><label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label><div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-sm text-white" /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
          {error && <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 flex items-start gap-2"><AlertCircle size={14} className="text-red-400 mt-0.5" /><p className="text-red-300 text-xs">{error}</p></div>}
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">{loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : 'Sign In'}</button>
          <p className="text-slate-500 text-xs text-center">Create first admin using ADMIN_EMAIL and ADMIN_PASSWORD env variables before first deploy.</p>
        </form>
        <div className="text-center mt-6"><Link to="/" className="text-slate-500 text-sm hover:text-slate-300">← Back to Shop</Link></div>
      </div>
    </div>
  );
}
