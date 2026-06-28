import React, { useEffect, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { api, getToken } from '../../lib/api';

type CustomerNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  active?: boolean;
  createdAt: string;
};

export default function AdminCustomerNotificationsTab() {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [form, setForm] = useState({ type: 'event', title: '', message: '', link: '/notifications' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await api.get<{ notifications: CustomerNotification[] }>('/admin/customer-notifications', getToken('admin'));
    setItems(res.notifications || []);
  };

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load notifications')); }, []);

  const publish = async () => {
    try {
      setSaving(true);
      setError('');
      await api.post('/admin/customer-notifications', form, getToken('admin'));
      setForm({ type: 'event', title: '', message: '', link: '/notifications' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish notification');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this customer notification?')) return;
    await api.delete(`/admin/customer-notifications/${id}`, getToken('admin'));
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-xl font-black mb-1 flex items-center gap-2"><Bell size={20} /> Customer Notifications</h2>
        <p className="text-sm text-gray-500 mb-4">Publish company events, new promo alerts, and sale offers to all customer notification pages.</p>
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
        <div className="grid md:grid-cols-4 gap-3">
          <select className="border rounded-xl p-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="event">Company Event</option>
            <option value="sale">Sale Offer</option>
            <option value="promo">New Promo</option>
            <option value="system">System Notice</option>
          </select>
          <input className="border rounded-xl p-3 text-sm md:col-span-2" placeholder="Notification title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm" placeholder="Link e.g. /flash-sale" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <textarea className="border rounded-xl p-3 text-sm md:col-span-3" rows={3} placeholder="Notification message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button disabled={saving} onClick={publish} className="bg-blue-600 text-white rounded-xl font-bold disabled:opacity-60">{saving ? 'Publishing...' : 'Publish'}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-4 border-b font-black">Published Notifications</div>
        <div className="divide-y">
          {items.length === 0 && <p className="p-6 text-sm text-gray-500">No customer notifications yet.</p>}
          {items.map((item) => (
            <div key={item.id} className="p-4 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><Bell size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-gray-900">{item.title}</h3>
                  <span className="text-[10px] uppercase font-black bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{item.type}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(item.createdAt).toLocaleString()} · {item.link || '/notifications'}</p>
              </div>
              <button onClick={() => remove(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
