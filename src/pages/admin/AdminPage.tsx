import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingBag, Tag, LogOut,
  Shield, TrendingUp, Clock, CheckCircle, AlertCircle,
  Loader2, RefreshCw, Settings, Mail, Lock, User, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminSellersTab from './AdminSellersTab';
import AdminProductsTab from './AdminProductsTab';
import AdminOrdersTab from './AdminOrdersTab';
import AdminPromoCodesTab from './AdminPromoCodesTab';

export type AdminTab = 'dashboard' | 'sellers' | 'products' | 'orders' | 'promos' | 'settings';

interface Stats {
  totalSellers: number;
  pendingSellers: number;
  totalProducts: number;
  totalOrders: number;
  revenue: number;
  activePromos: number;
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [adminEmail, setAdminEmail] = useState('');
  const [authChecking, setAuthChecking] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/admin/login'); return; }

      const { data: adminRow } = await supabase
        .from('admin_users').select('id').eq('id', user.id).maybeSingle();
      if (!adminRow) { navigate('/admin/login'); return; }

      setAdminEmail(user.email ?? '');
      setAuthChecking(false);
    })();
  }, [navigate]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [
        { count: totalSellers },
        { count: pendingSellers },
        { count: totalProducts },
        { count: totalOrders },
        { data: revenueData },
        { count: activePromos },
      ] = await Promise.all([
        supabase.from('sellers').select('id', { count: 'exact', head: true }),
        supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
        supabase.from('promo_codes').select('id', { count: 'exact', head: true }).eq('active', true),
      ]);
      const revenue = (revenueData ?? []).reduce((s: number, r: { total_amount: number }) => s + Number(r.total_amount), 0);
      setStats({
        totalSellers: totalSellers ?? 0,
        pendingSellers: pendingSellers ?? 0,
        totalProducts: totalProducts ?? 0,
        totalOrders: totalOrders ?? 0,
        revenue,
        activePromos: activePromos ?? 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecking) loadStats();
  }, [authChecking, loadStats]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sellers',   label: 'Sellers',   icon: Users,       badge: stats?.pendingSellers || undefined },
    { id: 'products',  label: 'Products',  icon: Package },
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
    { id: 'promos',    label: 'Promo Codes', icon: Tag },
    { id: 'settings',  label: 'My Profile', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield size={15} className="text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-sm">Admin Panel</p>
              <p className="text-slate-500 text-[10px] truncate max-w-[120px]">{adminEmail}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{label}</span>
              {badge != null && badge > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-gray-900 text-lg capitalize">
              {tab === 'promos' ? 'Promo Codes' : tab === 'settings' ? 'My Profile' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h1>
            <p className="text-xs text-gray-400">Cartup Administrator Dashboard</p>
          </div>
          {tab === 'dashboard' && (
            <button onClick={loadStats} disabled={statsLoading}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          )}
        </header>

        <div className="flex-1 overflow-auto p-8">
          {/* ── Dashboard ── */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                    <StatCard icon={Users}       label="Total Sellers"    value={stats.totalSellers}                 color="bg-blue-500" onClick={() => setTab('sellers')} />
                    <StatCard icon={Clock}       label="Pending Approval" value={stats.pendingSellers}               color="bg-amber-500" sub="Awaiting review" onClick={() => setTab('sellers')} />
                    <StatCard icon={Package}     label="Total Products"   value={stats.totalProducts}                color="bg-green-500" onClick={() => setTab('products')} />
                    <StatCard icon={ShoppingBag} label="Total Orders"     value={stats.totalOrders}                  color="bg-purple-500" onClick={() => setTab('orders')} />
                    <StatCard icon={TrendingUp}  label="Paid Revenue"     value={`৳${stats.revenue.toLocaleString()}`} color="bg-emerald-600" />
                    <StatCard icon={Tag}         label="Active Promos"    value={stats.activePromos}                 color="bg-rose-500" onClick={() => setTab('promos')} />
                  </div>

                  {stats.pendingSellers > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={18} className="text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-amber-800">
                          {stats.pendingSellers} seller{stats.pendingSellers > 1 ? 's' : ''} waiting for approval
                        </p>
                        <p className="text-amber-600 text-sm mt-0.5">Review their documents and approve or reject their applications.</p>
                      </div>
                      <button onClick={() => setTab('sellers')}
                        className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                        Review Now
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        {[
                          { label: 'Review Pending Sellers', icon: Users, color: 'bg-amber-50 text-amber-600', tab: 'sellers' as AdminTab },
                          { label: 'Add New Product',        icon: Package, color: 'bg-green-50 text-green-600', tab: 'products' as AdminTab },
                          { label: 'Manage Orders',          icon: ShoppingBag, color: 'bg-purple-50 text-purple-600', tab: 'orders' as AdminTab },
                          { label: 'Create Promo Code',      icon: Tag, color: 'bg-rose-50 text-rose-600', tab: 'promos' as AdminTab },
                        ].map(({ label, icon: Icon, color, tab: t }) => (
                          <button key={label} onClick={() => setTab(t)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:opacity-80 transition-opacity ${color} bg-opacity-60`}>
                            <Icon size={16} /> <span className="text-sm font-semibold">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-800 mb-4">Seller Status Overview</h3>
                      {[
                        { label: 'Approved', icon: CheckCircle, color: 'text-green-500', count: stats.totalSellers - stats.pendingSellers },
                        { label: 'Pending',  icon: Clock,        color: 'text-amber-500', count: stats.pendingSellers },
                      ].map(({ label, icon: Icon, color, count }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2">
                            <Icon size={15} className={color} />
                            <span className="text-sm text-gray-600">{label}</span>
                          </div>
                          <span className="font-bold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                </div>
              )}
            </div>
          )}

          {tab === 'sellers'  && <AdminSellersTab />}
          {tab === 'products' && <AdminProductsTab />}
          {tab === 'orders'   && <AdminOrdersTab />}
          {tab === 'promos'   && <AdminPromoCodesTab />}
          {tab === 'settings' && <AdminSettingsTab adminEmail={adminEmail} onEmailChange={setAdminEmail} />}
        </div>
      </div>
    </div>
  );
}

// ── Admin Profile / Settings ──────────────────────────────────────────────────
function AdminSettingsTab({ adminEmail, onEmailChange }: { adminEmail: string; onEmailChange: (e: string) => void }) {
  const [username, setUsername] = useState('');
  const [newEmail, setNewEmail] = useState(adminEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.from('profiles')
      .select('full_name')
      .eq('id', (async () => {
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? '';
      })())
      .maybeSingle()
      .then(({ data }) => { if (data?.full_name) setUsername(data.full_name); });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (data?.full_name) setUsername(data.full_name);
    });
  }, []);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const saveUsername = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: username.trim() });
    setSaving(false);
    if (error) showMsg('Failed: ' + error.message, 'error');
    else showMsg('Username updated!', 'success');
  };

  const saveEmail = async () => {
    if (!newEmail.trim() || newEmail === adminEmail) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    if (error) showMsg('Failed: ' + error.message, 'error');
    else {
      await supabase.from('admin_users').update({ email: newEmail.trim() })
        .eq('email', adminEmail);
      onEmailChange(newEmail.trim());
      showMsg('Email updated! Check your inbox to confirm the change.', 'success');
    }
  };

  const savePassword = async () => {
    if (!newPassword) return;
    if (newPassword.length < 6) { showMsg('Password must be at least 6 characters', 'error'); return; }
    if (newPassword !== confirmPassword) { showMsg('Passwords do not match', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) showMsg('Failed: ' + error.message, 'error');
    else {
      setNewPassword(''); setConfirmPassword('');
      showMsg('Password changed successfully!', 'success');
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-bold text-gray-800 text-base mb-4 pb-3 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="max-w-lg space-y-4">
      {msg && (
        <div className={`flex items-center gap-2.5 p-4 rounded-2xl text-sm font-semibold ${
          msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <Section title="Display Name / Username">
        <div className="relative mb-3">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin display name"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
        </div>
        <button onClick={saveUsername} disabled={saving || !username.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          Save Name
        </button>
      </Section>

      <Section title="Change Email Address">
        <div className="relative mb-3">
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
        </div>
        <p className="text-xs text-gray-400 mb-3">A confirmation link will be sent to the new email address.</p>
        <button onClick={saveEmail} disabled={saving || !newEmail.trim() || newEmail === adminEmail}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          Update Email
        </button>
      </Section>

      <Section title="Change Password">
        <div className="space-y-3 mb-3">
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPw ? 'text' : 'password'} value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min. 6 chars)"
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors" />
          </div>
        </div>
        <button onClick={savePassword} disabled={saving || !newPassword}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          Change Password
        </button>
      </Section>
    </div>
  );
}
