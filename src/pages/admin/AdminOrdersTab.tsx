import React, { useEffect, useState } from 'react';
import { Barcode, Bike, ChevronDown, ChevronUp, MapPin, Package, Phone, Printer, User } from 'lucide-react';
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

const escapeHtml = (value: any) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const money = (value: any) => `৳${Number(value || 0).toLocaleString()}`;

const getItemProduct = (item: any) => item?.productSnapshot || item?.product || {};


export default function AdminOrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState('');
  const [assignMessage, setAssignMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, deliveryRes] = await Promise.all([
        api.get<{ orders: any[] }>('/admin/orders', getToken('admin')),
        api.get<{ deliveryMen: any[] }>('/admin/delivery-men', getToken('admin')).catch(() => ({ deliveryMen: [] })),
      ]);
      setOrders(ordersRes.orders || []);
      setDeliveryMen(deliveryRes.deliveryMen || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
      setOrders([]);
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


  const printOrder = (order: any) => {
    const address = order.shippingAddress || {};
    const items = order.items || [];
    const printWindow = window.open('', '_blank', 'width=920,height=720');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to print the order.');
      return;
    }

    const itemRows = items.map((item: any, index: number) => {
      const product = getItemProduct(item);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(product.name || 'Product')}</strong>
            ${item.cancellationStatus === 'cancelled' ? `<div class="cancelled">Cancelled: ${escapeHtml(item.cancelReason || 'Cancelled by customer')}</div>` : ''}
          </td>
          <td class="center">${escapeHtml(item.quantity || 0)}</td>
          <td class="right">${escapeHtml(money(item.unitPrice))}</td>
          <td class="right">${escapeHtml(money(item.totalPrice))}</td>
        </tr>`;
    }).join('');

    const barcodeBlock = order.orderBarcode ? `
      <div class="barcode-box">
        <img src="${escapeHtml(order.orderBarcode)}" alt="Order barcode" />
        <div class="barcode-id">${escapeHtml(order.orderBarcodeValue || order.orderNumber || '')}</div>
      </div>` : `<div class="barcode-box empty">No barcode generated</div>`;

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print Order ${escapeHtml(order.orderNumber || '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 24px; background: #fff; }
    .sheet { max-width: 860px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 26px; letter-spacing: .5px; }
    h2 { margin: 0 0 8px; font-size: 16px; }
    .muted { color: #6b7280; font-size: 12px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
    .line { margin: 5px 0; font-size: 13px; line-height: 1.45; }
    .label { font-weight: 700; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th { background: #f9fafb; color: #374151; font-size: 12px; text-align: left; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; font-size: 13px; vertical-align: top; }
    .center { text-align: center; }
    .right { text-align: right; }
    .summary { width: 340px; margin-left: auto; margin-top: 14px; }
    .summary-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .summary-row.total { font-size: 18px; font-weight: 900; border-bottom: 0; }
    .barcode-box { text-align: right; min-width: 220px; }
    .barcode-box img { max-width: 240px; max-height: 84px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; }
    .barcode-id { font-size: 12px; font-weight: 800; letter-spacing: 2px; margin-top: 5px; }
    .empty { color: #9ca3af; border: 1px dashed #d1d5db; border-radius: 10px; padding: 20px; }
    .cancelled { color: #dc2626; font-size: 11px; font-weight: 700; margin-top: 4px; }
    .print-actions { margin-bottom: 16px; text-align: right; }
    .print-actions button { background: #f97316; color: white; border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 800; cursor: pointer; }
    @media print {
      body { padding: 0; }
      .sheet { max-width: none; }
      .print-actions { display: none; }
      .card, th, td { border-color: #cbd5e1; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="print-actions"><button onclick="window.print()">Print Order</button></div>
    <div class="top">
      <div>
        <h1>Order Slip</h1>
        <div class="muted">Generated from Shoppy Admin Panel</div>
        <div class="line"><span class="label">Order No:</span> ${escapeHtml(order.orderNumber || 'N/A')}</div>
        <div class="line"><span class="label">Date:</span> ${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A')}</div>
      </div>
      ${barcodeBlock}
    </div>

    <div class="grid">
      <div class="card">
        <h2>Customer & Delivery</h2>
        <div class="line"><span class="label">Name:</span> ${escapeHtml(address.name || order.user?.fullName || 'N/A')}</div>
        <div class="line"><span class="label">Phone:</span> ${escapeHtml(address.phone || order.user?.phone || 'N/A')}</div>
        <div class="line"><span class="label">Email:</span> ${escapeHtml(order.user?.email || 'N/A')}</div>
        <div class="line"><span class="label">Address:</span> ${escapeHtml(formatAddress(address))}</div>
        ${address.landmark ? `<div class="line"><span class="label">Landmark:</span> ${escapeHtml(address.landmark)}</div>` : ''}
      </div>
      <div class="card">
        <h2>Order & Payment</h2>
        <div class="line"><span class="label">Status:</span> ${escapeHtml(order.status || 'N/A')}</div>
        <div class="line"><span class="label">Payment Method:</span> ${escapeHtml(order.paymentMethod || 'N/A')}</div>
        <div class="line"><span class="label">Payment Status:</span> ${escapeHtml(order.paymentStatus || 'N/A')}</div>
        <div class="line"><span class="label">Delivery Man:</span> ${escapeHtml(order.deliveryMan?.fullName || 'Not assigned')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>#</th><th>Product</th><th class="center">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr>
      </thead>
      <tbody>${itemRows || '<tr><td colspan="5" class="center">No products found</td></tr>'}</tbody>
    </table>

    <div class="summary">
      <div class="summary-row"><span>Subtotal</span><strong>${escapeHtml(money(order.subtotalAmount || order.subtotal || 0))}</strong></div>
      <div class="summary-row"><span>Delivery Charge</span><strong>${escapeHtml(money(order.deliveryCharge || 0))}</strong></div>
      <div class="summary-row"><span>Platform Fee</span><strong>${escapeHtml(money(order.platformFee || 0))}</strong></div>
      <div class="summary-row"><span>VAT</span><strong>${escapeHtml(money(order.vatAmount || order.vat || 0))}</strong></div>
      <div class="summary-row"><span>Discount</span><strong>-${escapeHtml(money(order.discountAmount || 0))}</strong></div>
      <div class="summary-row total"><span>Total</span><span>${escapeHtml(money(order.totalAmount || 0))}</span></div>
    </div>
  </div>
  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 250); };
  </script>
</body>
</html>`);
    printWindow.document.close();
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
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
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
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setOpenOrder(isOpen ? null : o.id)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border font-bold text-xs hover:bg-gray-50">
                          {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} View
                        </button>
                        <button onClick={() => printOrder(o)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-700">
                          <Printer size={14}/> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t bg-orange-50/30">
                      <td colSpan={8} className="p-4">
                        <div className="grid lg:grid-cols-3 gap-4">
                          <div className="bg-white border rounded-2xl p-4 lg:col-span-3">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h3 className="font-black text-gray-900 flex items-center gap-2"><Barcode size={16}/> Order Barcode</h3>
                              <button onClick={() => printOrder(o)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-700"><Printer size={14}/> Print Order</button>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              {o.orderBarcode ? (
                                <img src={o.orderBarcode} alt={o.orderBarcodeValue || o.orderNumber || 'Order barcode'} className="h-20 max-w-full object-contain border rounded-xl bg-white p-2" />
                              ) : (
                                <div className="h-20 min-w-[220px] rounded-xl border bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">No barcode generated</div>
                              )}
                              <div className="text-sm text-gray-700 space-y-1">
                                <p><b>Order No:</b> {o.orderNumber || 'N/A'}</p>
                                <p><b>Barcode ID:</b> <span className="font-black tracking-widest">{o.orderBarcodeValue || 'N/A'}</span></p>
                                <p className="text-xs text-gray-500">Generated automatically when customer places the order.</p>
                              </div>
                            </div>
                          </div>
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
                                const product = getItemProduct(item);
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
