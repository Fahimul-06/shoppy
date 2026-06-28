import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { api, getToken } from '../../lib/api';

const statusClass = (status: string) => {
  if (status === 'approved') return 'bg-green-50 text-green-700 border-green-100';
  if (status === 'denied') return 'bg-red-50 text-red-700 border-red-100';
  if (status === 'refunded') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

export default function AdminReturnsTab() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await api.get<{ returns: any[] }>('/admin/returns', getToken('admin'));
    setReturns(r.returns || []);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const update = async (id: string, status: string) => {
    setBusy(id + status);
    try {
      await api.patch(`/admin/returns/${id}`, { status, adminNote: note[id] || '' }, getToken('admin'));
      await load();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-black">Return Requests</h2>
        <p className="text-sm text-gray-500">Approve or deny customer return requests. Seller-owned product returns are also visible to that seller.</p>
      </div>
      {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div> : returns.length === 0 ? <div className="p-10 text-center text-gray-500">No return requests yet.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Request</th><th>Product</th><th>Customer</th><th>Seller</th><th>Status</th><th className="text-left">Admin note</th><th>Action</th></tr></thead>
            <tbody>{returns.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3 min-w-44"><b>{r.order?.orderNumber || 'Order'}</b><p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p><p className="text-xs text-gray-500 mt-1">Reason: {r.reason}</p>{r.details && <p className="text-xs text-gray-500">{r.details}</p>}</td>
                <td className="p-3 min-w-52"><div className="flex items-center gap-2"><img src={r.product?.image || r.product?.images?.[0]} className="w-10 h-10 rounded-lg object-cover bg-gray-100"/><div><b>{r.product?.name || 'Product'}</b><p className="text-xs text-gray-500">Qty: {r.quantity}</p></div></div></td>
                <td className="p-3 text-center">{r.user?.email || 'Customer'}<p className="text-xs text-gray-400">{r.user?.phone}</p></td>
                <td className="p-3 text-center">{r.seller ? <><b>{r.seller.shopName || r.seller.name}</b><p className="text-xs text-gray-400">{r.seller.email}</p></> : <span className="text-gray-400">Admin product</span>}</td>
                <td className="p-3 text-center"><span className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold capitalize ${statusClass(r.status)}`}>{r.status}</span></td>
                <td className="p-3 min-w-52"><textarea className="w-full border rounded-xl p-2 text-xs" rows={2} placeholder="Optional note" value={note[r.id] ?? r.adminNote ?? ''} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })}/></td>
                <td className="p-3 text-center min-w-48"><div className="flex flex-wrap gap-2 justify-center"><button disabled={busy===r.id+'approved'} onClick={() => update(r.id, 'approved')} className="px-3 py-2 rounded-xl bg-green-600 text-white font-bold text-xs flex gap-1 items-center"><CheckCircle2 size={14}/> Accept</button><button disabled={busy===r.id+'denied'} onClick={() => update(r.id, 'denied')} className="px-3 py-2 rounded-xl bg-red-600 text-white font-bold text-xs flex gap-1 items-center"><XCircle size={14}/> Deny</button><select value={r.status} onChange={(e)=>update(r.id,e.target.value)} className="border rounded-xl px-2 py-2 text-xs"><option value="requested">Requested</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="received">Received</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
