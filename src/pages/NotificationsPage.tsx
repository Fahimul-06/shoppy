import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Gift, Megaphone, PackageCheck, Truck, Loader2, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getToken } from '../lib/api';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  image?: string;
  read?: boolean;
  createdAt: string;
};

function iconFor(type: string) {
  if (type === 'order_processing') return PackageCheck;
  if (type === 'order_shipped') return Truck;
  if (type === 'order_delivered') return ShoppingBag;
  if (type === 'promo' || type === 'sale') return Gift;
  return Megaphone;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = getToken('user');

  const load = async (markReadAfterLoad = false) => {
    if (!token) {
      navigate('/account');
      return;
    }
    try {
      setError('');
      const res = await api.get<{ notifications: NotificationItem[] }>('/notifications', token);
      const notifications = res.notifications || [];
      setItems(markReadAfterLoad ? notifications.map((n) => ({ ...n, read: true })) : notifications);

      if (markReadAfterLoad && notifications.some((n) => !n.read)) {
        await api.post('/notifications/mark-all-read', {}, token);
        window.dispatchEvent(new CustomEvent('customer-notifications-read'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    const timer = window.setInterval(() => load(false), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const markAllRead = async () => {
    if (!token) return;
    await api.post('/notifications/mark-all-read', {}, token);
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    window.dispatchEvent(new CustomEvent('customer-notifications-read'));
  };

  const openNotification = async (item: NotificationItem) => {
    if (token && !item.read) {
      try { await api.patch(`/notifications/${item.id}/read`, {}, token); } catch {}
    }
    navigate(item.link || '/notifications');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Bell className="text-orange-500" /> Notifications</h1>
          <p className="text-sm text-gray-500">Order updates, company events, promo codes, and sale offers.</p>
        </div>
        <button onClick={markAllRead} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      {loading && <div className="bg-white border rounded-2xl p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" /> Loading notifications...</div>}
      {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="bg-white border rounded-2xl p-10 text-center">
          <Bell size={40} className="mx-auto text-gray-300 mb-3" />
          <h2 className="font-black text-gray-900">No notifications yet</h2>
          <p className="text-sm text-gray-500 mt-1">You will see order processing, shipped, delivered, promo, and sale updates here.</p>
          <Link to="/" className="inline-block mt-4 px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm">Continue shopping</Link>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = iconFor(item.type);
          return (
            <button
              key={item.id}
              onClick={() => openNotification(item)}
              className={`w-full text-left rounded-2xl border p-4 flex gap-4 transition hover:shadow-md ${item.read ? 'bg-white border-gray-100' : 'bg-orange-50 border-orange-200'}`}
            >
              {item.image ? (
                <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover border bg-white" />
              ) : (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.read ? 'bg-gray-100 text-gray-500' : 'bg-orange-500 text-white'}`}>
                  <Icon size={22} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-black text-gray-900 line-clamp-1">{item.title}</h2>
                  {!item.read && <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
