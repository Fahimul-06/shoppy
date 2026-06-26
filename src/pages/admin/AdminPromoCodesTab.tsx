import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Promo = { id:string; code:string; description?:string; discountType:'percentage'|'fixed'; discountValue:number; minOrder:number; maxUses?:number; usedCount:number; active:boolean; created_at:string };
const empty = { code:'', description:'', discountType:'percentage', discountValue:'', minOrder:'', maxUses:'', active:true };

export default function AdminPromoCodesTab() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<Promo | null>(null);
  const load = async () => setPromos(await apiFetch<Promo[]>('/api/admin/promo-codes'));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const payload = { ...form, discountValue:Number(form.discountValue), minOrder:form.minOrder?Number(form.minOrder):0, maxUses:form.maxUses?Number(form.maxUses):undefined };
    if (editing) await apiFetch(`/api/admin/promo-codes/${editing.id}`, { method:'PATCH', body: JSON.stringify(payload) });
    else await apiFetch('/api/admin/promo-codes', { method:'POST', body: JSON.stringify(payload) });
    setForm(empty); setEditing(null); await load();
  };
  const del = async (id:string) => { if(confirm('Delete promo?')) { await apiFetch(`/api/admin/promo-codes/${id}`, { method:'DELETE' }); await load(); } };
  const edit = (p:Promo) => { setEditing(p); setForm({ code:p.code, description:p.description||'', discountType:p.discountType, discountValue:String(p.discountValue), minOrder:String(p.minOrder||''), maxUses:String(p.maxUses||''), active:p.active }); };
  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className="xl:col-span-2 bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Code</th><th className="p-3">Discount</th><th className="p-3">Active</th><th className="p-3">Actions</th></tr></thead><tbody>{promos.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-mono font-bold">{p.code}<br/><span className="font-sans text-xs text-gray-400">{p.description}</span></td><td className="p-3 text-center">{p.discountType==='percentage'?`${p.discountValue}%`:`৳${p.discountValue}`}</td><td className="p-3 text-center">{p.active?'Yes':'No'}</td><td className="p-3 text-center space-x-2"><button onClick={()=>edit(p)} className="text-blue-600 font-semibold">Edit</button><button onClick={()=>del(p.id)} className="text-red-600 font-semibold">Delete</button></td></tr>)}</tbody></table></div><div className="bg-white rounded-2xl border p-5 h-fit space-y-3"><h3 className="font-bold">{editing?'Edit':'Create'} Promo</h3>{['code','description','discountValue','minOrder','maxUses'].map(k=><input key={k} value={form[k]} onChange={e=>setForm((f:any)=>({...f,[k]:e.target.value}))} placeholder={k} className="w-full border rounded-xl px-3 py-2 text-sm"/>)}<select value={form.discountType} onChange={e=>setForm((f:any)=>({...f,discountType:e.target.value}))} className="w-full border rounded-xl px-3 py-2 text-sm"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm((f:any)=>({...f,active:e.target.checked}))}/> Active</label><button onClick={save} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl">Save</button></div></div>;
}
