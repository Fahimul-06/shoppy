import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, Loader2, Eye, X, Check, Package, MapPin, Phone, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Order {
  id: string; order_number: string; status: string; payment_status: string;
  total_amount: number; created_at: string; shipping_address: Record<string, string> | null;
  subtotal: number; discount_amount: number; delivery_fee: number; payment_method: string | null;
}

interface OrderItem {
  id: string; quantity: number; unit_price: number; total_price: number;
  product_snapshot: { name: string; image: string; price: number };
}

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
const PAYMENT_STATUSES = ['pending','paid','failed','refunded'];

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  refunded:   'bg-gray-200 text-gray-600',
  paid:       'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-600',
};

function Badge({ value }: { value: string }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  );
}

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const q = supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data } = await (statusFilter ? q.eq('status', statusFilter) : q);
    setOrders(data ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (order: Order) => {
    setSelected(order);
    setItemsLoading(true);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setItems(data ?? []);
    setItemsLoading(false);
  };

  const updateOrderStatus = async (id: string, field: 'status' | 'payment_status', value: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o));
      if (selected?.id === id) setSelected((o) => o ? { ...o, [field]: value } : o);
      showToast('Order updated');
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700">
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <p className="text-sm text-gray-500 ml-auto">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Payment</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{o.order_number}</p>
                      <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{o.shipping_address?.full_name ?? 'Guest'}</p>
                      <p className="text-xs text-gray-400">{o.shipping_address?.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">৳{Number(o.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge value={o.status} />
                        <div className="relative">
                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, 'status', e.target.value)}
                            disabled={updatingId === o.id}
                            className="text-xs pl-1.5 pr-5 py-1 border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer disabled:opacity-50 appearance-none"
                          >
                            {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge value={o.payment_status} />
                        <div className="relative">
                          <select
                            value={o.payment_status}
                            onChange={(e) => updateOrderStatus(o.id, 'payment_status', e.target.value)}
                            disabled={updatingId === o.id}
                            className="text-xs pl-1.5 pr-5 py-1 border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer disabled:opacity-50 appearance-none"
                          >
                            {PAYMENT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openDetail(o)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{selected.order_number}</h2>
                <p className="text-xs text-gray-400">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Statuses */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-2">Order Status</p>
                  <div className="relative">
                    <select value={selected.status} onChange={(e) => updateOrderStatus(selected.id, 'status', e.target.value)}
                      className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-2">Payment Status</p>
                  <div className="relative">
                    <select value={selected.payment_status} onChange={(e) => updateOrderStatus(selected.id, 'payment_status', e.target.value)}
                      className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {PAYMENT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Customer */}
              {selected.shipping_address && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Shipping Address</p>
                  <div className="space-y-1.5 text-sm text-gray-700">
                    <div className="flex items-center gap-2"><User size={13} className="text-gray-400" /><span className="font-semibold">{selected.shipping_address.full_name}</span></div>
                    <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400" /><span>{selected.shipping_address.phone}</span></div>
                    <div className="flex items-start gap-2"><MapPin size={13} className="text-gray-400 mt-0.5" /><span>{[selected.shipping_address.address_line1, selected.shipping_address.city, selected.shipping_address.district].filter(Boolean).join(', ')}</span></div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order Items</p>
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <img src={item.product_snapshot?.image} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.product_snapshot?.name}</p>
                          <p className="text-xs text-gray-400">Qty: {item.quantity} × ৳{Number(item.unit_price).toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-gray-900 flex-shrink-0">৳{Number(item.total_price).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="border-t border-gray-100 pt-4 space-y-1.5">
                {[
                  { label: 'Subtotal', value: selected.subtotal },
                  { label: 'Discount', value: -selected.discount_amount },
                  { label: 'Delivery', value: selected.delivery_fee },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm text-gray-500">
                    <span>{label}</span>
                    <span className={value < 0 ? 'text-green-600' : ''}>৳{Math.abs(Number(value)).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>৳{Number(selected.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2">
          <Check size={14} className="text-green-400" /> {toast}
        </div>
      )}
    </div>
  );
}
