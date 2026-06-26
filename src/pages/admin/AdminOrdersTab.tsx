import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
const PAYMENT_STATUSES = ['pending','paid','failed','refunded'];

type Order = { id:string; order_number:string; status:string; payment_status:string; total_amount:number; created_at:string; customer?: {name?:string; phone?:string}; items?: any[] };

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setOrders(await apiFetch<Order[]>(`/api/admin/orders${status ? `?status=${status}` : ''}`));
    setLoading(false);
  };
  useEffect(() => { load(); }, [status]);
  const update = async (id:string, body:Record<string,string>) => { await apiFetch(`/api/admin/orders/${id}`, { method:'PATCH', body: JSON.stringify(body) }); await load(); };
  if (loading) return <p className="p-6 text-gray-500">Loading orders...</p>;
  return <div className="space-y-4">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Orders</h2><select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2"><option value="">All status</option>{ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Customer</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className="border-t"><td className="p-3 font-semibold">{o.order_number}<br/><span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString()}</span></td><td className="p-3">{o.customer?.name || 'Guest'}<br/><span className="text-xs text-gray-400">{o.customer?.phone}</span></td><td className="p-3"><select value={o.status} onChange={e=>update(o.id,{status:e.target.value})} className="border rounded-lg px-2 py-1">{ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></td><td className="p-3"><select value={o.payment_status} onChange={e=>update(o.id,{payment_status:e.target.value})} className="border rounded-lg px-2 py-1">{PAYMENT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></td><td className="p-3 text-right font-bold">৳{Number(o.total_amount).toLocaleString()}</td></tr>)}</tbody></table></div>
  </div>;
}
