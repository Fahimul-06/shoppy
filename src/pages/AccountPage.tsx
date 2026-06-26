import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, ShoppingCart,
  Package, MapPin, Heart, LogOut, Edit2, AlertCircle, Check,
  Loader2, ChevronRight, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string; full_name: string | null; phone: string | null; avatar_url: string | null;
}

interface Order {
  id: string; order_number: string; status: string; total_amount: number; created_at: string;
  order_items: { id: string }[];
}

// ── Logged-in dashboard ───────────────────────────────────────────────────────
function CustomerDashboard({ userId, userEmail }: { userId: string; userEmail: string }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'edit'>('overview');
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prof }, { data: ords }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('orders').select('id,order_number,status,total_amount,created_at, order_items(id)')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);
    setProfile(prof);
    setOrders(ords ?? []);
    setEditForm({ name: prof?.full_name ?? '', phone: prof?.phone ?? '' });
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg('');
    const { error } = await supabase.from('profiles').upsert({
      id: userId, full_name: editForm.name.trim() || null, phone: editForm.phone.trim() || null,
    });
    if (!error) {
      setProfile((p) => p ? { ...p, full_name: editForm.name || null, phone: editForm.phone || null } : p);
      setProfileMsg('Profile saved!');
      setTimeout(() => setProfileMsg(''), 3000);
      setActiveTab('overview');
    } else {
      setProfileMsg('Failed to save: ' + error.message);
    }
    setSavingProfile(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-500',
  };

  const displayName = profile?.full_name || userEmail.split('@')[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <ShoppingCart size={16} className="text-white" />
            </div>
            <span className="text-lg font-extrabold text-gray-900">Cart<span className="text-orange-500">up</span></span>
          </Link>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-extrabold">{displayName[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-white font-extrabold text-lg leading-tight">{displayName}</p>
                <p className="text-orange-100 text-sm">{userEmail}</p>
                {profile?.phone && <p className="text-orange-100 text-xs mt-0.5">{profile.phone}</p>}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {([
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'orders', label: `Orders (${orders.length})`, icon: Package },
              { id: 'edit', label: 'Edit Profile', icon: Edit2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === id ? 'text-orange-500 border-orange-500' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
            ) : (
              <>
                {/* Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    {[
                      { icon: Package, label: 'My Orders', count: orders.length, onClick: () => setActiveTab('orders') },
                      { icon: Heart, label: 'Wishlist', count: null, onClick: () => {} },
                      { icon: MapPin, label: 'Saved Addresses', count: null, onClick: () => {} },
                    ].map(({ icon: Icon, label, count, onClick }) => (
                      <button key={label} onClick={onClick}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-gray-100 transition-colors group">
                        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-orange-500" />
                        </div>
                        <span className="flex-1 text-left text-sm font-semibold text-gray-700">{label}</span>
                        {count != null && <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
                        <ChevronRight size={15} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Orders */}
                {activeTab === 'orders' && (
                  orders.length === 0 ? (
                    <div className="text-center py-10">
                      <Package size={40} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">No orders yet</p>
                      <p className="text-gray-400 text-sm mt-1">Your orders will appear here</p>
                      <Link to="/" className="inline-block mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{o.order_number}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {o.status}
                            </span>
                            <span className="font-bold text-gray-900 text-sm">৳{Number(o.total_amount).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Edit Profile */}
                {activeTab === 'edit' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Your full name"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="01XXXXXXXXX"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={userEmail} disabled
                          className="w-full pl-10 pr-4 py-3 border border-gray-100 rounded-xl text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
                    </div>
                    {profileMsg && (
                      <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${profileMsg.startsWith('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {profileMsg.startsWith('Failed') ? <AlertCircle size={14} /> : <Check size={14} />}
                        {profileMsg}
                      </div>
                    )}
                    <button onClick={saveProfile} disabled={savingProfile}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                      {savingProfile ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Check size={14} />Save Profile</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <button onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors">
          <LogOut size={15} /> Sign Out
        </button>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-orange-500 flex items-center justify-center gap-1.5 transition-colors">
            <ArrowLeft size={13} /> Back to shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Auth forms (not logged in) ────────────────────────────────────────────────
export default function AccountPage() {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null | undefined>(undefined);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPw, setShowPw] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Check current session
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthUser(null); return; }
      // Block admin users from the customer portal
      const { data: adminRow } = await supabase
        .from('admin_users').select('id').eq('id', user.id).maybeSingle();
      if (adminRow) {
        await supabase.auth.signOut();
        setAuthUser(null);
        setError('Admin accounts must use the Admin Portal to sign in.');
        return;
      }
      setAuthUser({ id: user.id, email: user.email ?? '' });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) { setAuthUser(null); return; }
      const { data: adminRow } = await supabase
        .from('admin_users').select('id').eq('id', session.user.id).maybeSingle();
      if (adminRow) {
        await supabase.auth.signOut();
        setAuthUser(null);
        setError('Admin accounts must use the Admin Portal to sign in.');
        return;
      }
      setAuthUser({ id: session.user.id, email: session.user.email ?? '' });
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!loginForm.email.trim() || !loginForm.password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      if (authErr) throw authErr;
      // Admin check is handled by onAuthStateChange above
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.toLowerCase().includes('invalid') ? 'Invalid email or password.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const { name, email, phone, password, confirm } = registerForm;
    if (!name.trim()) { setError('Full name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), phone: phone.trim() } },
      });
      if (authErr) throw authErr;
      // Update profile phone separately since the trigger only sets full_name
      const { data: { user } } = await supabase.auth.getUser();
      if (user && phone.trim()) {
        await supabase.from('profiles').upsert({ id: user.id, phone: phone.trim() });
      }
      setSuccess('Account created! You are now signed in.');
      setRegisterForm({ name: '', email: '', phone: '', password: '', confirm: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg.toLowerCase().includes('already') ? 'An account with this email already exists.' : msg);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authUser === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  // Logged in as customer
  if (authUser) {
    return <CustomerDashboard userId={authUser.id} userEmail={authUser.email} />;
  }

  // Not logged in — show auth forms
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ShoppingCart size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Cart<span className="text-orange-500">up</span></span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Bangladesh's favorite online shop</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                className={`flex-1 py-4 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  tab === t ? 'text-orange-500 border-orange-500' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 mb-4">
                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 mb-4">
                <Check size={14} className="text-green-500" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="you@example.com" required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPw ? 'text' : 'password'} value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="Enter your password" required
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95">
                  {loading ? <><Loader2 size={14} className="animate-spin" />Signing in...</> : 'Sign In'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setTab('register')} className="text-orange-500 font-semibold hover:underline">
                    Create one
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {[
                  { key: 'name', label: 'Full Name', type: 'text', icon: User, placeholder: 'Your full name' },
                  { key: 'email', label: 'Email Address', type: 'email', icon: Mail, placeholder: 'you@example.com' },
                  { key: 'phone', label: 'Phone Number', type: 'tel', icon: Phone, placeholder: '01XXXXXXXXX' },
                ].map(({ key, label, type, icon: Icon, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={type} required={key !== 'phone'} placeholder={placeholder}
                        value={registerForm[key as keyof typeof registerForm]}
                        onChange={(e) => setRegisterForm({ ...registerForm, [key]: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPw ? 'text' : 'password'} required placeholder="Min. 6 characters"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" required placeholder="Confirm your password"
                      value={registerForm.confirm}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirm: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95">
                  {loading ? <><Loader2 size={14} className="animate-spin" />Creating account...</> : 'Create Account'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setTab('login')} className="text-orange-500 font-semibold hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-5">
          <Link to="/" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors">
            <ArrowLeft size={14} /> Back to shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
