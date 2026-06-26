import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const { data: adminRow } = await supabase
        .from('admin_users').select('id').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle();

      if (!adminRow) {
        await supabase.auth.signOut();
        setError('This account does not have admin access.');
        return;
      }
      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.toLowerCase().includes('invalid') ? 'Invalid email or password.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAdmin = async () => {
    if (!email.trim() || !password) { setError('Sign in first, then claim admin.'); return; }
    setClaiming(true);
    setError('');
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        // Try sign up if user doesn't exist
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
      }

      const { data: result, error: rpcErr } = await supabase.rpc('claim_first_admin');
      if (rpcErr) throw rpcErr;
      if (result === 'success') {
        setClaimSuccess(true);
        setTimeout(() => navigate('/admin'), 1500);
      } else {
        setError('An admin already exists. Contact your administrator.');
        await supabase.auth.signOut();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim admin');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
            <Shield size={30} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white text-center mb-1">Admin Panel</h1>
        <p className="text-slate-400 text-sm text-center mb-8">Cartup Administrator Access</p>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
          {claimSuccess ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
              <p className="text-green-400 font-bold">Admin account created!</p>
              <p className="text-slate-400 text-sm mt-1">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-slate-500 text-xs text-center mb-3">First time setup?</p>
                <button type="button" onClick={handleClaimAdmin} disabled={claiming}
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                  {claiming ? <><Loader2 size={14} className="animate-spin" /> Setting up...</> : 'Claim First Admin Account'}
                </button>
                <p className="text-slate-600 text-xs text-center mt-2">
                  Only works if no admin exists yet
                </p>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
            ← Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
