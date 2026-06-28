import React, { useEffect, useState } from 'react';
import { ShieldX } from 'lucide-react';
import { api, getToken } from '../../lib/api';

export default function AdminCancellationsTab() {
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ cancellations: any[] }>('/admin/cancellations', getToken('admin'))
      .then((r) => setCancellations(r.cancellations || []))
      .catch(() => setCancellations([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">Loading cancellations...</div>;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-black flex items-center gap-2"><ShieldX /> Product Cancellations</h2>
        <p className="text-sm text-gray-500">Products cancelled by customers within the 12-hour cancellation window.</p>
      </div>
      {cancellations.length === 0 ? <div className="p-8 text-center text-gray-500">No product cancellations yet.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Cancelled product</th><th>Order</th><th>Customer</th><th>Seller</th><th>Reason</th><th>Status</th><th>Cancelled at</th></tr></thead>
            <tbody>{cancellations.map((c) => <tr key={c.id || c._id} className="border-t align-top"><td className="p-3 min-w-56"><div className="flex gap-2 items-center"><img src={c.product?.image || 'https://placehold.co/80x80?text=Product'} className="w-11 h-11 rounded-lg object-cover bg-gray-100"/><div><b>{c.product?.name || 'Product'}</b><p className="text-xs text-gray-500">Qty: {c.quantity || 1}</p></div></div></td><td className="p-3 text-center"><b>{c.order?.orderNumber || 'Order'}</b><p className="text-xs text-gray-400">{c.order?.createdAt ? new Date(c.order.createdAt).toLocaleString() : ''}</p></td><td className="p-3 text-center">{c.user?.email || 'Customer'}<p className="text-xs text-gray-400">{c.user?.phone || ''}</p></td><td className="p-3 text-center">{c.seller?.shopName || c.seller?.name || 'Admin product'}</td><td className="p-3 text-gray-600">{c.reason || '-'}</td><td className="p-3 text-center"><span className="inline-flex px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-bold capitalize">{c.status}</span></td><td className="p-3 text-center text-gray-500">{c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : '-'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
