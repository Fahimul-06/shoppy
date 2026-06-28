import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Mail, MapPin, Phone, ShoppingBag, UserRound } from 'lucide-react';
import { api, getToken } from '../../lib/api';

const money = (value: number) => `৳${Number(value || 0).toLocaleString()}`;
const addressLine = (address: any) => [address?.address, address?.area, address?.district, address?.division].filter(Boolean).join(', ');

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white border rounded-2xl p-4"><h3 className="font-black text-gray-900 mb-3">{title}</h3>{children}</div>;
}

export default function AdminCustomersTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ customers: any[] }>('/admin/customers', getToken('admin'));
      setCustomers(r.customers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const r = await api.get<any>(`/admin/customers/${id}/detail`, getToken('admin'));
      setDetail(r);
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedId) {
    const customer = detail?.customer;
    return <div className="space-y-4">
      <button onClick={() => { setSelectedId(null); setDetail(null); }} className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-xl font-bold text-sm"><ArrowLeft size={16}/> Back to customers</button>
      {detailLoading || !detail ? <div className="bg-white rounded-2xl border p-12 flex justify-center"><Loader2 className="animate-spin"/></div> : <>
        <div className="bg-white border rounded-2xl p-5 flex flex-col md:flex-row gap-4 md:items-center">
          {customer.profilePhoto ? <img src={customer.profilePhoto} alt={customer.fullName} className="w-20 h-20 rounded-2xl object-cover bg-gray-100"/> : <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><UserRound size={34}/></div>}
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900">{customer.fullName || 'Customer'}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Mail size={14}/> {customer.email}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={14}/> {customer.phone || 'No phone saved'}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white border rounded-2xl p-4"><p className="text-xs text-gray-500">Total Orders</p><p className="text-2xl font-black">{customer.totalOrders}</p></div>
          <div className="bg-white border rounded-2xl p-4"><p className="text-xs text-gray-500">Total Purchase</p><p className="text-2xl font-black">{money(customer.totalSpent)}</p></div>
          <div className="bg-white border rounded-2xl p-4"><p className="text-xs text-gray-500">Joined</p><p className="text-sm font-bold mt-2">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</p></div>
        </div>

        <Card title="Saved Delivery Addresses">
          {customer.addresses?.length ? <div className="grid md:grid-cols-2 gap-3">{customer.addresses.map((a: any) => <div key={a.id || a._id} className="border rounded-xl p-3 text-sm"><p className="font-bold flex items-center gap-1"><MapPin size={14}/> {a.label || 'Address'} {a.isDefault && <span className="text-xs text-green-600">Default</span>}</p><p>{addressLine(a) || a.address || 'No address text'}</p><p className="text-gray-500">{a.name || customer.fullName} • {a.phone || customer.phone || 'No phone'}</p>{a.landmark && <p className="text-gray-500">Landmark: {a.landmark}</p>}</div>)}</div> : <p className="text-sm text-gray-500">No saved delivery address.</p>}
        </Card>

        <Card title="Customer Orders">
          {(detail.orders || []).length ? <div className="space-y-3">{detail.orders.map((order: any) => <div key={order.id} className="border rounded-xl p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold"><ShoppingBag size={14} className="inline mr-1"/> {order.orderNumber}</p><p className="font-bold">{money(order.totalAmount)}</p></div><p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()} • Status: {order.status} • Payment: {order.paymentStatus}</p><div className="mt-2 space-y-1">{(order.items || []).map((item: any) => <p key={item.id || item._id} className="text-sm text-gray-700">{item.productSnapshot?.name || item.product?.name || 'Product'} — Qty {item.quantity} — {money(item.totalPrice)}</p>)}</div></div>)}</div> : <p className="text-sm text-gray-500">No orders found.</p>}
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Return Requests">
            {(detail.returns || []).length ? <div className="space-y-2">{detail.returns.map((r: any) => <div key={r.id} className="border rounded-xl p-3 text-sm"><p className="font-bold">{r.product?.name || 'Product'} — {r.status}</p><p className="text-gray-500">Reason: {r.reason}</p></div>)}</div> : <p className="text-sm text-gray-500">No returns.</p>}
          </Card>
          <Card title="Cancellations">
            {(detail.cancellations || []).length ? <div className="space-y-2">{detail.cancellations.map((c: any) => <div key={c.id} className="border rounded-xl p-3 text-sm"><p className="font-bold">{c.product?.name || 'Product'} — {c.status}</p><p className="text-gray-500">Reason: {c.reason}</p></div>)}</div> : <p className="text-sm text-gray-500">No cancellations.</p>}
          </Card>
        </div>
      </>}
    </div>;
  }

  return <div className="bg-white rounded-2xl border overflow-x-auto"><div className="p-4 border-b flex justify-between"><h2 className="text-xl font-black">Customers</h2><span className="text-xs font-bold text-gray-500">{customers.length} total</span></div>{loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin"/></div> : <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Customer</th><th>Phone</th><th>Orders</th><th>Total Purchase</th><th>Last Order</th><th>Details</th></tr></thead><tbody>{customers.map((c) => <tr key={c.id} className="border-t"><td className="p-3"><b>{c.fullName || 'Customer'}</b><p className="text-xs text-gray-500">{c.email}</p></td><td className="text-center">{c.phone || 'N/A'}</td><td className="text-center font-bold">{c.totalOrders}</td><td className="text-center font-bold">{money(c.totalSpent)}</td><td className="text-center text-xs text-gray-500">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : 'No order'}</td><td className="p-3 text-center"><button onClick={() => openDetail(c.id)} className="px-3 py-2 rounded-lg border font-bold text-xs hover:bg-gray-50">View</button></td></tr>)}</tbody></table>}</div>;
}
