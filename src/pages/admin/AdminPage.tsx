import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Headphones, Image as ImageIcon, LogOut, MessageCircle, Package, RotateCcw, UserCog, ShieldX, ShoppingBag, Tag, UserPlus, UserRound, Users, Percent, Bike } from 'lucide-react';
import { api, clearSession, getSessionUser, getToken } from '../../lib/api';
import AdminSellersTab from './AdminSellersTab';
import AdminProductsTab from './AdminProductsTab';
import AdminOrdersTab from './AdminOrdersTab';
import AdminPromoCodesTab from './AdminPromoCodesTab';
import AdminReturnsTab from './AdminReturnsTab';
import AdminCancellationsTab from './AdminCancellationsTab';
import AdminCustomersTab from './AdminCustomersTab';
import AdminMessagesTab from './AdminMessagesTab';
import AdminCustomerCareTab from './AdminCustomerCareTab';
import AdminCustomerNotificationsTab from './AdminCustomerNotificationsTab';
import AdminSalesTab from './AdminSalesTab';
import AdminBannersTab from './AdminBannersTab';
import AdminSettingsTab from './AdminSettingsTab';
import AdminEmployeesTab from './AdminEmployeesTab';
import AdminDeliveryMenTab from './AdminDeliveryMenTab';

type AdminTab = 'dashboard' | 'sellers' | 'customers' | 'products' | 'sales' | 'banners' | 'orders' | 'returns' | 'cancellations' | 'messages' | 'customerCare' | 'promos' | 'notifications' | 'employees' | 'deliveryMen' | 'settings';

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [admin, setAdmin] = useState<any>(getSessionUser('admin'));
  const [stats, setStats] = useState({ totalSellers: 0, pendingSellers: 0, totalProducts: 0, totalOrders: 0, revenue: 0, activePromos: 0 });
  const [notificationCounts, setNotificationCounts] = useState({ orders: 0, returns: 0, cancellations: 0 });

  useEffect(() => {
    const token = getToken('admin');
    if (!token) { navigate('/admin/login'); return; }
    api.get<{ user: any }>('/admin/me', token).then(({ user }) => { setAdmin(user); localStorage.setItem('adminUser', JSON.stringify(user)); }).catch(() => { clearSession('admin'); navigate('/admin/login'); });
  }, [navigate]);
  const loadNotificationCounts = () => {
    api.get<{ counts: any }>('/admin/notification-counts', getToken('admin'))
      .then((r) => setNotificationCounts({ orders: Number(r.counts?.orders || 0), returns: Number(r.counts?.returns || 0), cancellations: Number(r.counts?.cancellations || 0) }))
      .catch(() => {});
  };
  useEffect(() => { if (tab === 'dashboard') api.get<{ stats: any }>('/admin/stats', getToken('admin')).then(r => setStats(r.stats)).catch(()=>{}); }, [tab]);
  useEffect(() => {
    loadNotificationCounts();
    const timer = window.setInterval(loadNotificationCounts, 15000);
    return () => window.clearInterval(timer);
  }, []);
  const logout = () => { clearSession('admin'); navigate('/admin/login'); };
  const allNav = [ ['dashboard', BarChart3], ['sellers', Users], ['customers', UserRound], ['products', Package], ['sales', Percent], ['banners', ImageIcon], ['orders', ShoppingBag], ['returns', RotateCcw], ['cancellations', ShieldX], ['messages', MessageCircle], ['customerCare', Headphones], ['promos', Tag], ['notifications', Bell], ['employees', UserPlus], ['deliveryMen', Bike], ['settings', UserCog] ] as const;
  const isOwnerAdmin = admin?.adminType !== 'employee';
  const allowed = new Set<string>(isOwnerAdmin ? allNav.map(([id]) => id) : ['dashboard', ...(admin?.adminPermissions || [])]);
  const nav = allNav.filter(([id]) => allowed.has(id) || (id === 'settings' && isOwnerAdmin) || (id === 'employees' && isOwnerAdmin));

  return <div className="min-h-screen bg-gray-100">
    <header className="bg-slate-950 text-white"><div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center"><div><h1 className="text-xl font-black">Admin Dashboard</h1><p className="text-xs text-slate-300">{admin?.adminType === 'employee' ? `${admin?.fullName || 'Employee'} • ${admin?.adminPosition || 'Employee'}` : admin?.email}</p></div><button onClick={logout} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-sm"><LogOut size={15}/> Logout</button></div></header>
    <div className="max-w-7xl mx-auto px-4 py-6"><div className="flex flex-wrap gap-2 mb-6">{nav.map(([id, Icon])=>{
          const badge = id === 'orders' ? notificationCounts.orders : id === 'returns' ? notificationCounts.returns : id === 'cancellations' ? notificationCounts.cancellations : 0;
          return <button key={id} onClick={()=>setTab(id)} className={`relative capitalize px-4 py-2 rounded-xl font-bold text-sm flex gap-2 items-center ${tab===id?'bg-blue-600 text-white':'bg-white text-gray-600'}`}><Icon size={15}/>{id}{badge > 0 && <span className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${tab===id?'bg-white text-blue-700':'bg-red-500 text-white'}`}>{badge > 99 ? '99+' : badge}</span>}</button>;
        })}</div>
      {tab==='dashboard' && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[
        ['Total Sellers', stats.totalSellers], ['Pending Sellers', stats.pendingSellers], ['Total Products', stats.totalProducts], ['Total Orders', stats.totalOrders], ['Paid Revenue', `৳${stats.revenue.toLocaleString()}`], ['Active Promos', stats.activePromos]
      ].map(([k,v])=><div key={k} className="bg-white rounded-2xl p-6 border"><p className="text-sm text-gray-500">{k}</p><p className="text-3xl font-black text-gray-900 mt-1">{v}</p></div>)}</div>}
      {tab==='sellers' && <AdminSellersTab/>}{tab==='customers' && <AdminCustomersTab/>}{tab==='products' && <AdminProductsTab/>}{tab==='sales' && <AdminSalesTab/>}{tab==='banners' && <AdminBannersTab/>}{tab==='orders' && <AdminOrdersTab/>}{tab==='returns' && <AdminReturnsTab/>}{tab==='cancellations' && <AdminCancellationsTab/>}{tab==='messages' && <AdminMessagesTab/>}{tab==='customerCare' && <AdminCustomerCareTab/>}{tab==='promos' && <AdminPromoCodesTab/>}{tab==='notifications' && <AdminCustomerNotificationsTab/>}{tab==='employees' && <AdminEmployeesTab/>}{tab==='deliveryMen' && <AdminDeliveryMenTab/>}{tab==='settings' && <AdminSettingsTab/>}
    </div>
  </div>;
}
