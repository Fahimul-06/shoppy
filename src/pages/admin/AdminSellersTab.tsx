import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Seller = { id:string; fullName?:string; email:string; phone?:string; shopName?:string; sellerStatus:string; createdAt:string };

export default function AdminSellersTab() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const load = async () => setSellers(await apiFetch<Seller[]>('/api/admin/sellers'));
  useEffect(() => { load(); }, []);
  const update = async (id:string, status:string) => { await apiFetch(`/api/admin/sellers/${id}`, { method:'PATCH', body: JSON.stringify({ status }) }); await load(); };
  return <div className="space-y-4"><h2 className="text-xl font-bold">Sellers</h2><div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Seller</th><th className="p-3 text-left">Shop</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{sellers.map(s=><tr key={s.id} className="border-t"><td className="p-3"><b>{s.fullName || s.email}</b><br/><span className="text-xs text-gray-400">{s.email} {s.phone}</span></td><td className="p-3">{s.shopName || '-'}</td><td className="p-3 text-center capitalize">{s.sellerStatus}</td><td className="p-3 text-center space-x-2"><button onClick={()=>update(s.id,'approved')} className="bg-green-600 text-white px-3 py-1 rounded-lg">Approve</button><button onClick={()=>update(s.id,'rejected')} className="bg-red-600 text-white px-3 py-1 rounded-lg">Reject</button></td></tr>)}</tbody></table></div></div>;
}
