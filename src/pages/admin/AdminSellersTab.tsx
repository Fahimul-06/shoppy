import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeDollarSign, Building2, Loader2, MapPin, Package, Phone, ShoppingBag, Store, UserRound } from 'lucide-react';
import { api, getToken } from '../../lib/api';

const money = (value: number) => `৳${Number(value || 0).toLocaleString()}`;
const addressLine = (address: any) => [address?.address, address?.area, address?.district, address?.division].filter(Boolean).join(', ');

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white border rounded-2xl p-4"><h3 className="font-black text-gray-900 mb-3">{title}</h3>{children}</div>;
}

export default function AdminSellersTab() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.get<{ sellers: any[] }>('/admin/sellers', getToken('admin'));
    setSellers(r.sellers || []);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const status = async (id: string, value: string) => {
    await api.patch(`/admin/sellers/${id}/status`, { status: value }, getToken('admin'));
    await load();
    if (selectedId === id) await openDetail(id);
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const r = await api.get<any>(`/admin/sellers/${id}/detail`, getToken('admin'));
      setDetail(r);
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedId) {
    const seller = detail?.seller;
    return <div className="space-y-4">
      <button onClick={() => { setSelectedId(null); setDetail(null); }} className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-xl font-bold text-sm"><ArrowLeft size={16}/> Back to sellers</button>
      {detailLoading || !detail ? <div className="bg-white rounded-2xl border p-12 flex justify-center"><Loader2 className="animate-spin"/></div> : <>
        <div className="bg-white border rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Store size={22}/> {seller?.shopName || seller?.name || 'Seller'}</h2>
            <p className="text-sm text-gray-500">{seller?.email}</p>
            <p className="text-sm text-gray-600 mt-1">Status: <span className="font-bold capitalize">{seller?.status}</span></p>
          </div>
          <select value={seller?.status} onChange={(e) => status(seller.id, e.target.value)} className="border rounded-xl px-3 py-2 text-sm bg-white font-bold">
            <option>pending</option><option>approved</option><option>rejected</option><option>blocked</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Products Added', detail.stats.totalProducts, Package],
            ['Active Products', detail.stats.activeProducts, Package],
            ['Products Sold', detail.stats.productsSold, ShoppingBag],
            ['Seller Orders', detail.stats.totalOrders, ShoppingBag],
            ['Total Sale', money(detail.stats.totalSale), BadgeDollarSign],
          ].map(([label, value, Icon]: any) => <div key={label} className="bg-white border rounded-2xl p-4"><p className="text-xs text-gray-500 flex items-center gap-1"><Icon size={14}/> {label}</p><p className="text-2xl font-black mt-1">{value}</p></div>)}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <DetailCard title="Seller Contact & Shop Details">
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex gap-2"><UserRound size={16}/> <b>Name:</b> {seller?.name || 'N/A'}</p>
              <p className="flex gap-2"><Phone size={16}/> <b>Phone:</b> {seller?.phone || 'N/A'}</p>
              <p className="flex gap-2"><Building2 size={16}/> <b>Shop:</b> {seller?.shopName || 'N/A'}</p>
              <p className="flex gap-2"><MapPin size={16}/> <b>Shop Address:</b> {seller?.shopAddress || 'N/A'}</p>
            </div>
          </DetailCard>
          <DetailCard title="Business Details">
            <div className="space-y-2 text-sm text-gray-700">
              <p><b>Business Type:</b> {seller?.businessType || 'N/A'}</p>
              <p><b>NID Number:</b> {seller?.nidNumber || 'N/A'}</p>
              <p><b>TIN Number:</b> {seller?.tinNumber || 'N/A'}</p>
              <p><b>Bank:</b> {seller?.bankName || 'N/A'}</p>
              <p><b>Bank Account:</b> {seller?.bankAccount || 'N/A'}</p>
            </div>
          </DetailCard>
        </div>

        <DetailCard title="Seller Saved Addresses">
          {seller?.addresses?.length ? <div className="grid md:grid-cols-2 gap-3">{seller.addresses.map((a: any) => <div key={a.id || a._id} className="border rounded-xl p-3 text-sm"><p className="font-bold">{a.label || 'Address'} {a.isDefault && <span className="text-xs text-green-600">Default</span>}</p><p>{addressLine(a) || a.address || 'No address text'}</p><p className="text-gray-500">{a.name || seller.name} • {a.phone || seller.phone || 'No phone'}</p></div>)}</div> : <p className="text-sm text-gray-500">No saved seller address.</p>}
        </DetailCard>

        <DetailCard title="Products Added for Sale">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-2 text-left">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead><tbody>{(detail.products || []).map((p: any) => <tr key={p.id} className="border-t"><td className="p-2 font-bold">{p.name}</td><td className="text-center">{p.category}{p.subcategory ? ` / ${p.subcategory}` : ''}</td><td className="text-center">{money(p.price)}</td><td className="text-center">{p.stock || 0}</td><td className="text-center">{p.active === false ? 'Hidden' : 'Active'}</td></tr>)}</tbody></table></div>
        </DetailCard>

        <DetailCard title="Seller Order Sales">
          {(detail.orders || []).length ? <div className="space-y-3">{detail.orders.map(({ order, items }: any) => <div key={order.id} className="border rounded-xl p-3"><p className="font-bold">{order.orderNumber} <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span></p><p className="text-xs text-gray-500">Customer: {order.user?.fullName || 'Customer'} • {order.user?.email || 'No email'}</p>{items.map((item: any) => <p key={item.id || item._id} className="text-sm mt-1">{item.productSnapshot?.name || item.product?.name || 'Product'} — Qty {item.quantity} — {money(item.totalPrice)}</p>)}</div>)}</div> : <p className="text-sm text-gray-500">No sale yet for this seller.</p>}
        </DetailCard>
      </>}
    </div>;
  }

  return <div className="bg-white rounded-2xl border overflow-x-auto"><h2 className="text-xl font-black p-4">Sellers</h2>{loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin"/></div> : <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Seller</th><th>Shop</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>{sellers.map((s) => <tr key={s.id} className="border-t"><td className="p-3"><button onClick={() => openDetail(s.id)} className="text-left group"><b className="text-blue-700 group-hover:underline">{s.name || 'Seller'}</b><p className="text-xs text-gray-500">{s.email}</p></button></td><td className="text-center">{s.shopName}</td><td className="text-center">{s.phone || 'N/A'}</td><td className="text-center capitalize">{s.status}</td><td className="p-3 text-center"><select value={s.status} onChange={(e) => status(s.id, e.target.value)} className="border rounded-lg px-2 py-1"><option>pending</option><option>approved</option><option>rejected</option><option>blocked</option></select></td></tr>)}</tbody></table>}</div>;
}
