import React, { useEffect, useState } from 'react';
import { Barcode, Bike, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { api, getToken } from '../../lib/api';

const emptyForm = { fullName: '', phone: '', nid: '', password: '' };

export default function AdminDeliveryMenTab() {
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ deliveryMen: any[] }>('/admin/delivery-men', getToken('admin'));
      setDeliveryMen(r.deliveryMen || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setForm(emptyForm); setEditingId(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      if (editingId) {
        const payload: any = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/admin/delivery-men/${editingId}`, payload, getToken('admin'));
        setMessage('Delivery man updated successfully.');
      } else {
        const res = await api.post<{ deliveryMan: any; loginId: string }>('/admin/delivery-men', form, getToken('admin'));
        setMessage(`Delivery man ID created. Login ID: ${res.loginId || res.deliveryMan?.deliveryCode}`);
      }
      reset();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save delivery man');
    }
  };

  const edit = (d: any) => {
    setEditingId(d.id);
    setForm({ fullName: d.fullName || '', phone: d.phone || '', nid: d.nid || '', password: '' });
    setMessage('');
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this delivery man ID? Assigned orders will become unassigned.')) return;
    await api.delete(`/admin/delivery-men/${id}`, getToken('admin'));
    await load();
  };

  return (
    <div className="grid lg:grid-cols-[390px_1fr] gap-6">
      <form onSubmit={save} className="bg-white rounded-2xl border p-5 h-fit space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2"><Bike size={20}/> {editingId ? 'Edit Delivery Man' : 'Create Delivery Man ID'}</h2>
          {editingId && <button type="button" onClick={reset} className="text-xs font-bold text-gray-500 flex items-center gap-1"><X size={14}/> Cancel</button>}
        </div>
        <label className="block text-sm font-bold text-gray-700">Name<input required value={form.fullName} onChange={(e)=>setForm({...form, fullName:e.target.value})} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal" placeholder="Delivery man name" /></label>
        <label className="block text-sm font-bold text-gray-700">Phone<input required value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal" placeholder="01XXXXXXXXX" /></label>
        <label className="block text-sm font-bold text-gray-700">NID<input required value={form.nid} onChange={(e)=>setForm({...form, nid:e.target.value})} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal" placeholder="NID number" /></label>
        <label className="block text-sm font-bold text-gray-700">Password<input required={!editingId} value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal" placeholder={editingId ? 'Leave blank to keep old password' : 'Minimum 6 characters'} type="password" /></label>
        <button className="w-full bg-blue-600 text-white rounded-xl py-3 font-black flex items-center justify-center gap-2"><Save size={16}/> {editingId ? 'Update Delivery Man' : 'Create Delivery Man ID'}</button>
        {message && <p className={`text-sm font-bold ${message.toLowerCase().includes('success') || message.toLowerCase().includes('created') ? 'text-green-700' : 'text-red-600'}`}>{message}</p>}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 font-semibold">
          After creating, a unique 6-digit delivery ID and barcode are generated automatically. Delivery man logs in with the ID number and password.
        </div>
      </form>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between"><h2 className="text-xl font-black">Delivery Men</h2><span className="text-xs font-bold text-gray-500">{deliveryMen.length} total</span></div>
        {loading ? <div className="p-6 text-sm text-gray-500">Loading...</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Delivery Man</th><th className="p-3 text-center">ID Number</th><th className="p-3 text-center">Barcode</th><th className="p-3 text-left">Phone/NID</th><th className="p-3 text-center">Actions</th></tr></thead><tbody>{deliveryMen.map((d)=><tr key={d.id} className="border-t align-middle"><td className="p-3"><b>{d.fullName}</b><p className="text-xs text-gray-500">Created: {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A'}</p></td><td className="p-3 text-center"><span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1 font-black tracking-widest"><Barcode size={14}/>{d.deliveryCode || '------'}</span></td><td className="p-3 text-center">{d.deliveryBarcode ? <img src={d.deliveryBarcode} alt={d.deliveryCode || 'barcode'} className="mx-auto h-12 max-w-[160px] object-contain border rounded bg-white" /> : <span className="text-xs text-gray-400">No barcode</span>}</td><td className="p-3"><p>{d.phone}</p><p className="text-xs text-gray-500">NID: {d.nid}</p></td><td className="p-3 text-center"><div className="flex justify-center gap-2"><button onClick={()=>edit(d)} className="p-2 rounded-lg bg-blue-50 text-blue-700"><Edit3 size={16}/></button><button onClick={()=>remove(d.id)} className="p-2 rounded-lg bg-red-50 text-red-700"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
        {!loading && !deliveryMen.length && <div className="p-8 text-center text-sm text-gray-500"><Plus className="mx-auto mb-2"/> No delivery men created yet.</div>}
      </div>
    </div>
  );
}
