import React, { useEffect, useState } from 'react';
import { Bike, ChevronDown, ChevronUp, MapPin, Package, Phone, User } from 'lucide-react';
import { api, getToken } from '../../lib/api';

type OrderAddress = {
  name?: string;
  phone?: string;
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
};

const formatAddress = (address?: OrderAddress) => {
  if (!address) return 'No delivery address saved';
  return [address.address, address.landmark, address.area, address.district, address.division].filter(Boolean).join(', ') || 'No delivery address saved';
};

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState('');
  const [assignMessage, setAssignMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ordersRes, deliveryRes] = await Promise.all([
        api.get<{ orders: any[] }>('/admin/orders', getToken('admin')),
        api.get<{ deliveryMen: any[] }>('/admin/delivery-men', getToken('admin')).catch(() => ({ deliveryMen: [] })),
      ]);
      setOrders(ordersRes.orders || []);
      setDeliveryMen(deliveryRes.deliveryMen || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, field: string, value: string) => {
    await api.patch(`/admin/orders/${id}`, { [field]: value }, getToken('admin'));
    await load();
  };

  const toggleOrder = (id: string) => {
    setSelectedOrders((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const assignDelivery = async () => {
    setAssignMessage('');
    if (!selectedDeliveryMan || !selectedOrders.length) { setAssignMessage('Select a delivery man and at least one order.'); return; }
    try {
      const r = await api.post<{ message: string; assignedCount: number }>('/admin/orders/assign-delivery', { deliveryManId: selectedDeliveryMan, orderIds: selectedOrders }, getToken('admin'));
      setAssignMessage(`${r.assignedCount || selectedOrders.length} order(s) assigned. Set status to Shipped to show them in the delivery dashboard.`);
      setSelectedOrders([]);
      await load();
    } catch (error) {
      setAssignMessage(error instanceof Error ? error.message : 'Could not assign orders');
    }
  };

  if (loading) return <div className="bg-white rounded-2xl border p-6 text-sm text-gray-500">Loading orders...</div>;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Orders</h2><span className="text-xs font-bold text-gray-500">{orders.length} total</span></div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex items-center gap-2 font-black text-blue-900"><Bike size={18}/> Assign selected orders</div>
          <select value={selectedDeliveryMan} onChange={(e)=>setSelectedDeliveryMan(e.target.value)} className="border rounded-xl px-3 py-2 text-sm bg-white min-w-[220px]">
            <option value="">Select delivery man</option>
            {deliveryMen.map((d)=><option key={d.id} value={d.id}>{d.fullName} — {d.phone}</option>)}
          </select>
          <button onClick={assignDelivery} className="bg-blue-600 text-white rounded-xl px-4 py-2 font-black text-sm">Assign {selectedOrders.length ? `(${selectedOrders.length})` : ''}</button>
          <span className="text-xs font-semibold text-blue-700">Delivery man sees assigned orders only after status is Shipped.</span>
          {assignMessage && <span className={`text-xs font-bold ${assignMessage.includes('success') ? 'text-green-700' : 'text-red-600'}`}>{assignMessage}</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-center">Select</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Delivery Address</th>
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Payment</th>
              <th className="p-3 text-center">Details</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const address = o.shippingAddress || {};
              const isOpen = openOrder === o.id;
              return (
                <React.Fragment key={o.id}>
                  <tr className="border-t align-top hover:bg-gray-50/60">
                    <td className="p-3 text-center"><input type="checkbox" checked={selectedOrders.includes(o.id)} onChange={()=>toggleOrder(o.id)} /></td>
                    <td className="p-3">
                      <b>{o.orderNumber}</b>
                      <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</p>
                      {o.deliveryMan && <p className="mt-1 text-xs font-bold text-blue-700 flex items-center gap-1"><Bike size={12}/> {o.deliveryMan.fullName || 'Assigned'}</p>}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-gray-800 flex items-center gap-1"><User size={13}/> {address.name || o.user?.fullName || 'Customer'}</p>
                      <p className="text-xs text-gray-500">{o.user?.email || 'No email'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12}/> {address.phone || o.user?.phone || 'No phone'}</p>
                    </td>
                    <td className="p-3 max-w-xs">
                      <p className="font-semibold text-gray-800 flex items-start gap-1"><MapPin size={14} className="mt-0.5 flex-shrink-0"/> <span>{formatAddress(address)}</span></p>
                      {address.landmark && <p className="text-xs text-gray-500 mt-1">Landmark: {address.landmark}</p>}
                      {address.latitude && address.longitude && <a className="text-xs text-blue-600 font-bold mt-1 inline-block" href={`https://www.google.com/maps?q=${address.latitude},${address.longitude}`} target="_blank" rel="noreferrer">Open pinned location</a>}
                    </td>
                    <td className="p-3 text-center font-bold">৳{Number(o.totalAmount || 0).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <select value={o.status} onChange={(e) => update(o.id, 'status', e.target.value)} className="border rounded-lg px-2 py-1 text-xs bg-white">
                        {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <select value={o.paymentStatus} onChange={(e) => update(o.id, 'paymentStatus', e.target.value)} className="border rounded-lg px-2 py-1 text-xs bg-white">
                        {['pending', 'paid', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{o.paymentMethod || 'N/A'}</p>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => setOpenOrder(isOpen ? null : o.id)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border font-bold text-xs hover:bg-gray-50">
                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} View
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t bg-orange-50/30">
                      <td colSpan={8} className="p-4">
                        <div className="grid lg:grid-cols-3 gap-4">
                          <div className="bg-white border rounded-2xl p-4 lg:col-span-1">
                            <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2"><MapPin size={16}/> Delivery Details</h3>
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><b>Name:</b> {address.name || o.user?.fullName || 'N/A'}</p>
                              <p><b>Phone:</b> {address.phone || o.user?.phone || 'N/A'}</p>
                              <p><b>Email:</b> {o.user?.email || 'N/A'}</p>
                              <p><b>Address:</b> {formatAddress(address)}</p>
                              {address.landmark && <p><b>Landmark:</b> {address.landmark}</p>}
                              {address.latitude && address.longitude && <p><b>Map:</b> <a className="text-blue-600 font-bold" href={`https://www.google.com/maps?q=${address.latitude},${address.longitude}`} target="_blank" rel="noreferrer">Open pinned delivery location</a></p>}
                            </div>
                          </div>
                          <div className="bg-white border rounded-2xl p-4 lg:col-span-2">
                            <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2"><Package size={16}/> Ordered Products</h3>
                            <div className="space-y-3">
                              {(o.items || []).map((item: any) => {
                                const product = item.productSnapshot || item.product || {};
                                return (
                                  <div key={item.id || item._id || product.id} className="flex gap-3 border rounded-xl p-3">
                                    {product.image && <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900">{product.name || 'Product'}</p>
                                      <p className="text-xs text-gray-500">Qty: {item.quantity} • Unit: ৳{Number(item.unitPrice || 0).toLocaleString()} • Total: ৳{Number(item.totalPrice || 0).toLocaleString()}</p>
                                      {item.cancellationStatus === 'cancelled' && <p className="text-xs font-bold text-red-600 mt-1">Cancelled: {item.cancelReason || 'Cancelled by customer'}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
