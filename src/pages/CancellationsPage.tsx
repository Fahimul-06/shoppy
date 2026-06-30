import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock3, ShieldX } from 'lucide-react';
import { cancelOrderedProduct, fetchUserCancellations, fetchUserOrders } from '../lib/db';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const within12Hours = (createdAt: string) => Date.now() - new Date(createdAt).getTime() <= TWELVE_HOURS_MS;
const itemName = (item: any) => item?.productSnapshot?.name || item?.product?.name || 'Ordered product';
const itemImage = (item: any) => item?.productSnapshot?.image || item?.productSnapshot?.images?.[0] || item?.product?.image || 'https://placehold.co/120x120?text=Product';

export default function CancellationsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [orderList, cancellationList] = await Promise.all([
      fetchUserOrders().catch(() => []),
      fetchUserCancellations().catch(() => []),
    ]);
    setOrders(orderList);
    setCancellations(cancellationList);
  };

  useEffect(() => { load(); }, []);

  const cancellableItems = useMemo(() => {
    return orders.flatMap((order) => {
      if (!['pending', 'processing'].includes(order.status)) return [];
      if (!within12Hours(order.createdAt)) return [];
      return (order.items || [])
        .filter((item: any) => item.cancellationStatus !== 'cancelled')
        .map((item: any) => ({ order, item }));
    });
  }, [orders]);

  const cancelItem = async (orderId: string, orderItemId: string) => {
    setBusy(orderItemId);
    setMsg('');
    try {
      await cancelOrderedProduct({ orderId, orderItemId, reason: reason[orderItemId] || 'Cancelled by customer' });
      setMsg('Ordered product cancelled successfully. Admin and seller can now see this cancellation.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Cancellation failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link>
      <h1 className="text-2xl font-black mb-2 flex items-center gap-2"><ShieldX/> Cancellations</h1>
      <p className="text-sm text-gray-500 mb-5 flex items-center gap-2"><Clock3 size={16}/> You can cancel each ordered product within 12 hours after placing the order.</p>
      {msg && <p className="mb-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl p-3 text-sm">{msg}</p>}

      <section className="mb-8">
        <h2 className="font-black text-lg mb-3">Cancellable products</h2>
        {cancellableItems.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No products are currently cancellable. Only pending/processing products within 12 hours can be cancelled.</div>
        ) : (
          <div className="space-y-4">
            {cancellableItems.map(({ order, item }) => {
              const id = item.id || item._id;
              return (
                <div key={`${order.id}-${id}`} className="bg-white border rounded-2xl p-5 grid md:grid-cols-[1fr_auto] gap-4">
                  <div className="flex gap-3">
                    <img src={itemImage(item)} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                    <div>
                      <p className="font-black">{itemName(item)}</p>
                      <p className="text-xs text-gray-400">Order: {order.orderNumber} · {new Date(order.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity} · Amount: ৳{Number(item.totalPrice || 0).toLocaleString()}</p>
                      <input value={reason[id] || ''} onChange={(e) => setReason((prev) => ({ ...prev, [id]: e.target.value }))} className="mt-3 border rounded-xl px-3 py-2 text-sm w-full max-w-md" placeholder="Cancellation reason optional" />
                    </div>
                  </div>
                  <button disabled={busy === id} onClick={() => cancelItem(order.id || order._id, id)} className="h-fit px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-60">{busy === id ? 'Cancelling...' : 'Cancel Product'}</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-black text-lg mb-3">Cancellation history</h2>
        {cancellations.length === 0 ? (
          <div className="bg-white border rounded-2xl p-6 text-center text-gray-500">No cancelled products yet.</div>
        ) : (
          <div className="bg-white border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="p-3 text-left">Product</th><th>Order</th><th>Reason</th><th>Status</th><th>Cancelled</th></tr></thead>
              <tbody>{cancellations.map((c) => <tr key={c.id || c._id} className="border-t"><td className="p-3"><div className="flex gap-2 items-center"><img src={c.product?.image || 'https://placehold.co/80x80?text=Product'} className="w-10 h-10 rounded-lg object-cover"/><b>{c.product?.name || 'Product'}</b></div></td><td className="text-center">{c.order?.orderNumber || 'Order'}</td><td className="text-center text-gray-600">{c.reason || '-'}</td><td className="text-center"><span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-bold capitalize">{c.status}</span></td><td className="text-center text-gray-500">{c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : '-'}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
