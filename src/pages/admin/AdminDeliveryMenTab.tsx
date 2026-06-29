import React, { useEffect, useState } from 'react';
import { Bike, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
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

  const reset = () => { setForm(emptyForm); setEditingId(null); setMessage(''); };

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
        await api.post('/admin/delivery-men', form, getToken('admin'));
        setMessage('Delivery man ID created successfully.');
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
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
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
        {message && <p className={`text-sm font-bold ${message.toLowerCase().includes('success') || message.toLowerCase().includes('created') || message.toLowerCase().includes('updated') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        <p className="text-xs text-gray-500">Delivery man can login from <b>/delivery/login</b> using phone number and password.</p>
      </form>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between"><h2 className="text-xl font-black">Delivery Men</h2><span className="text-xs font-bold text-gray-500">{deliveryMen.length} total</span></div>
        {loading ? <div className="p-6 text-sm text-gray-500">Loading...</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">NID</th><th className="p-3 text-center">Action</th></tr></thead><tbody>{deliveryMen.map((d)=> <tr key={d.id} className="border-t"><td className="p-3 font-bold">{d.fullName}</td><td className="p-3">{d.phone}</td><td className="p-3">{d.nid}</td><td className="p-3"><div className="flex justify-center gap-2"><button onClick={()=>edit(d)} className="px-3 py-2 rounded-lg border font-bold text-xs flex items-center gap-1"><Edit3 size={13}/> Edit</button><button onClick={()=>remove(d.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1"><Trash2 size={13}/> Delete</button></div></td></tr>)}</tbody></table></div>}
        {!loading && !deliveryMen.length && <div className="p-8 text-center text-sm text-gray-500"><Plus className="mx-auto mb-2"/> No delivery man ID created yet.</div>}
      </div>
    </div>
  );
}
