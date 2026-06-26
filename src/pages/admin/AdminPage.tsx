import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingBag, Tag, LogOut, Shield } from 'lucide-react';
import { apiFetch, clearSession, getStoredUser } from '../../lib/api';
import AdminSellersTab from './AdminSellersTab';
import AdminProductsTab from './AdminProductsTab';
import AdminOrdersTab from './AdminOrdersTab';
import AdminPromoCodesTab from './AdminPromoCodesTab';

type Tab = 'dashboard' | 'sellers' | 'products' | 'orders' | 'promos';
type Stats = { sellers:number; pendingSellers:number; products:number; orders:number; revenue:number; activePromos:number };

function Stat({ label, value, onClick }: { label:string; value:string|number; onClick?:()=>void }) {
  return <button onClick={onClick} className="text-left bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"><p className="text-2xl font-extrabold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></button>;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const user = getStoredUser<any>();

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/admin/login');
  }, [navigate]);

  const loadStats = async () => setStats(await apiFetch<Stats>('/api/admin/stats'));
  useEffect(() => { loadStats().catch(() => navigate('/admin/login')); }, []);

  const logout = () => { clearSession(); navigate('/admin/login'); };
  const nav = [
    ['dashboard','Dashboard',LayoutDashboard], ['sellers','Sellers',Users], ['products','Products',Package], ['orders','Orders',ShoppingBag], ['promos','Promo Codes',Tag],
  ] as const;

  return <div className="min-h-screen bg-slate-50 flex">
    <aside className="w-60 bg-slate-900 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2.5"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><Shield size={15} className="text-white" /></div><div><p className="text-white font-extrabold text-sm">Admin Panel</p><p className="text-slate-500 text-[10px] truncate max-w-[140px]">{user?.email}</p></div></div>
      <nav className="flex-1 p-3 space-y-1">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${tab===id?'bg-blue-600 text-white':'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Icon size={16}/>{label}</button>)}</nav>
      <div className="p-3 border-t border-slate-800"><button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-900/30 hover:text-red-400"><LogOut size={16}/> Sign Out</button></div>
    </aside>
    <main className="flex-1 min-w-0"><header className="bg-white border-b border-gray-100 px-8 py-4"><h1 className="font-extrabold text-gray-900 text-lg capitalize">{tab === 'promos' ? 'Promo Codes' : tab}</h1><p className="text-xs text-gray-400">Render + MongoDB dashboard</p></header><div className="p-8">
      {tab==='dashboard' && <div className="space-y-6"><div className="grid grid-cols-2 xl:grid-cols-3 gap-4"><Stat label="Total Sellers" value={stats?.sellers ?? '-'} onClick={()=>setTab('sellers')} /><Stat label="Pending Sellers" value={stats?.pendingSellers ?? '-'} onClick={()=>setTab('sellers')} /><Stat label="Products" value={stats?.products ?? '-'} onClick={()=>setTab('products')} /><Stat label="Orders" value={stats?.orders ?? '-'} onClick={()=>setTab('orders')} /><Stat label="Paid Revenue" value={`৳${(stats?.revenue ?? 0).toLocaleString()}`} /><Stat label="Active Promos" value={stats?.activePromos ?? '-'} onClick={()=>setTab('promos')} /></div><div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-700">Backend is now Express + MongoDB. Supabase has been removed.</div></div>}
      {tab==='sellers' && <AdminSellersTab />}{tab==='products' && <AdminProductsTab />}{tab==='orders' && <AdminOrdersTab />}{tab==='promos' && <AdminPromoCodesTab />}
    </div></main>
  </div>;
}
