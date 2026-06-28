import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { fetchUserOrders, fetchUserReturns, requestReturn } from '../lib/db';

const statusClass = (status: string) => {
  if (status === 'approved') return 'bg-green-50 text-green-700 border-green-100';
  if (status === 'denied') return 'bg-red-50 text-red-700 border-red-100';
  if (status === 'refunded') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

export default function ReturnsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    const [orderRows, returnRows] = await Promise.all([fetchUserOrders(), fetchUserReturns()]);
    setOrders(orderRows || []);
    setReturns(returnRows || []);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const returnedItemIds = useMemo(() => new Set(returns.map((r) => String(r.orderItem))), [returns]);
  const delivered = orders.filter((o) => o.status === 'delivered');

  const submit = async (order: any, item: any) => {
    const key = item.id || item._id;
    if (!reason[key]) { setMsg('Please select a return reason first.'); return; }
    setBusy(key);
    setMsg('');
    try {
      await requestReturn({ orderId: order.id, orderItemId: key, reason: reason[key], details: details[key] || '', quantity: item.quantity || 1 });
      setMsg('Return request submitted. Admin will review and approve or deny it.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Return request failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link>
      <h1 className="text-2xl font-black mb-2 flex items-center gap-2"><RotateCcw/> Returns</h1>
      <p className="text-sm text-gray-500 mb-5">Request product returns from delivered orders and track admin decisions.</p>
      {msg && <p className={`mb-4 border rounded-xl p-3 text-sm ${msg.includes('failed') || msg.includes('select') || msg.includes('required') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>{msg}</p>}
      {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          <section className="space-y-4">
            <h2 className="font-black text-lg">Request a Return</h2>
            {delivered.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No delivered orders available for return request.</div> : delivered.map((o) => (
              <div key={o.id} className="bg-white border rounded-2xl p-5">
                <div className="flex justify-between gap-3 mb-3"><div><p className="font-black">{o.orderNumber}</p><p className="text-xs text-gray-400">Delivered order</p></div><p className="font-bold">৳{Number(o.totalAmount || 0).toLocaleString()}</p></div>
                <div className="space-y-3">{(o.items || []).map((item: any) => {
                  const key = item.id || item._id;
                  const product = item.productSnapshot || item.product || {};
                  const already = returnedItemIds.has(String(key));
                  return <div key={key} className="border rounded-xl p-3"><div className="flex gap-3"><img src={product.image || product.images?.[0]} className="w-14 h-14 rounded-xl object-cover bg-gray-100"/><div className="flex-1"><p className="font-bold text-sm">{product.name || 'Product'}</p><p className="text-xs text-gray-500">Qty: {item.quantity} • ৳{Number(item.unitPrice || item.unit_price || 0).toLocaleString()}</p>{already ? <p className="mt-2 text-xs font-bold text-amber-600">Return request already submitted for this product.</p> : <div className="mt-3 grid sm:grid-cols-2 gap-2"><select className="border rounded-xl p-2 text-xs" value={reason[key] || ''} onChange={(e)=>setReason({...reason,[key]:e.target.value})}><option value="">Select reason</option><option value="Damaged product">Damaged product</option><option value="Wrong item delivered">Wrong item delivered</option><option value="Product not as described">Product not as described</option><option value="Size or fit issue">Size or fit issue</option><option value="Other">Other</option></select><input className="border rounded-xl p-2 text-xs" placeholder="Details optional" value={details[key] || ''} onChange={(e)=>setDetails({...details,[key]:e.target.value})}/><button disabled={busy===key} onClick={()=>submit(o,item)} className="sm:col-span-2 bg-gray-900 text-white rounded-xl py-2 font-bold text-xs flex justify-center gap-2">{busy===key && <Loader2 size={14} className="animate-spin"/>}Submit Return Request</button></div>}</div></div></div>;
                })}</div>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h2 className="font-black text-lg">My Return Requests</h2>
            {returns.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No return requests submitted yet.</div> : returns.map((r) => (
              <div key={r.id} className="bg-white border rounded-2xl p-5">
                <div className="flex justify-between gap-3"><div><p className="font-black">{r.product?.name || 'Product'}</p><p className="text-xs text-gray-400">{r.order?.orderNumber || 'Order'} • {new Date(r.createdAt).toLocaleString()}</p></div><span className={`h-fit px-3 py-1 rounded-full border text-xs font-bold capitalize ${statusClass(r.status)}`}>{r.status}</span></div>
                <p className="text-sm text-gray-600 mt-3">Reason: {r.reason}</p>
                {r.adminNote && <p className="text-sm text-blue-700 bg-blue-50 rounded-xl p-3 mt-3">Admin note: {r.adminNote}</p>}
                {r.seller && <p className="text-xs text-gray-400 mt-3">Seller: {r.seller.shopName || r.seller.name}</p>}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
