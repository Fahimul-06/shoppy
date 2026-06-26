import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Phone, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SellerLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const sanitized = phone.replace(/\s/g, '');
    if (!/^01[3-9]\d{8}$/.test(sanitized)) {
      setError('Enter a valid BD phone number (01XXXXXXXXX)');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setLoading(true);
    try {
      const email = `${sanitized}@seller.shopbd.com`;
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      navigate('/seller/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.toLowerCase().includes('invalid') ? 'Invalid phone number or password.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-orange-100 bg-white/80 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-gray-900 text-lg">Seller Center</span>
        </Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← Back to Shop
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-200">
              <Store size={28} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Sign in to your Seller Center</p>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 mt-2"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In to Seller Center'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            New seller?{' '}
            <Link to="/seller/register" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors">
              Register your shop
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
