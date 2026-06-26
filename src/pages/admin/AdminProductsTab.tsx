import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Product } from '../../types';
import { categories } from '../../data/categories';

const empty = { name:'', price:'', originalPrice:'', image:'', category:'phones', brand:'', stock:'', badge:'', description:'' };

export default function AdminProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Product | null>(null);
  const load = async () => setProducts(await apiFetch<Product[]>('/api/admin/products'));
  useEffect(() => { load(); }, []);
  const setF = (k:string,v:string) => setForm(f=>({...f,[k]:v}));
  const openEdit = (p:Product) => { setEditing(p); setForm({ name:p.name, price:String(p.price), originalPrice:String(p.originalPrice||''), image:p.image, category:p.category, brand:p.brand||'', stock:String(p.stock||''), badge:p.badge||'', description:p.description||'' }); };
  const save = async () => {
    const payload = { ...form, price:Number(form.price), originalPrice:form.originalPrice?Number(form.originalPrice):undefined, stock:form.stock?Number(form.stock):0, badge:form.badge || undefined };
    if (editing) await apiFetch(`/api/admin/products/${editing.id}`, { method:'PATCH', body: JSON.stringify(payload) });
    else await apiFetch('/api/admin/products', { method:'POST', body: JSON.stringify(payload) });
    setForm(empty); setEditing(null); await load();
  };
  const del = async (id:string) => { if(confirm('Delete this product?')) { await apiFetch(`/api/admin/products/${id}`, { method:'DELETE' }); await load(); } };
  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <div className="xl:col-span-2 bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Product</th><th className="p-3">Category</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Stock</th><th className="p-3">Actions</th></tr></thead><tbody>{products.map(p=><tr key={p.id} className="border-t"><td className="p-3 flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded-lg object-cover"/><span className="font-medium line-clamp-1">{p.name}</span></td><td className="p-3 text-center">{p.category}</td><td className="p-3 text-right">৳{p.price.toLocaleString()}</td><td className="p-3 text-right">{p.stock}</td><td className="p-3 text-center space-x-2"><button onClick={()=>openEdit(p)} className="text-blue-600 font-semibold">Edit</button><button onClick={()=>del(p.id)} className="text-red-600"><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>
    <div className="bg-white rounded-2xl border p-5 h-fit space-y-3"><h3 className="font-bold flex items-center gap-2"><Plus size={16}/>{editing?'Edit':'Add'} Product</h3>{['name','price','originalPrice','image','brand','stock'].map(k=><input key={k} value={(form as any)[k]} onChange={e=>setF(k,e.target.value)} placeholder={k} className="w-full border rounded-xl px-3 py-2 text-sm"/>)}<select value={form.category} onChange={e=>setF('category',e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm">{categories.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select><select value={form.badge} onChange={e=>setF('badge',e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm"><option value="">No badge</option><option value="sale">sale</option><option value="new">new</option><option value="hot">hot</option></select><textarea value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="description" className="w-full border rounded-xl px-3 py-2 text-sm"/><button onClick={save} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl">Save</button>{editing && <button onClick={()=>{setEditing(null);setForm(empty);}} className="w-full border py-2.5 rounded-xl">Cancel</button>}</div>
  </div>;
}
