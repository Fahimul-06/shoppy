import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Store, Plus, Trash2 } from 'lucide-react';
import { apiFetch, clearSession, getStoredUser } from '../../lib/api';
import type { Product } from '../../types';
import { categories } from '../../data/categories';

const empty = { name:'', price:'', image:'', category:'phones', brand:'', stock:'', description:'' };

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const user = getStoredUser<any>();
  const [seller, setSeller] = useState<any>(user);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const load = async () => { setSeller(await apiFetch('/api/seller/me')); setProducts(await apiFetch<Product[]>('/api/seller/products')); };
  useEffect(() => { if(!user || user.role !== 'seller') navigate('/seller/login'); else load().catch(()=>navigate('/seller/login')); }, []);
  const logout = () => { clearSession(); navigate('/seller/login'); };
  const setF = (k:string,v:string) => setForm(f=>({...f,[k]:v}));
  const save = async () => { await apiFetch('/api/seller/products', { method:'POST', body: JSON.stringify({ ...form, price:Number(form.price), stock:Number(form.stock||0) }) }); setForm(empty); await load(); };
  const del = async (id:string) => { if(confirm('Delete this product?')) { await apiFetch(`/api/seller/products/${id}`, { method:'DELETE' }); await load(); } };
  return <div className="min-h-screen bg-gray-50"><header className="bg-white border-b px-6 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><Store className="text-orange-500"/><div><h1 className="font-extrabold">Seller Center</h1><p className="text-xs text-gray-400">{seller?.shopName || seller?.email}</p></div></div><button onClick={logout} className="flex items-center gap-2 text-red-500 font-semibold"><LogOut size={16}/> Logout</button></header><main className="max-w-6xl mx-auto p-6 space-y-6"><div className="bg-white rounded-2xl border p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Account status</p><p className="text-xl font-extrabold capitalize">{seller?.sellerStatus}</p></div>{seller?.sellerStatus !== 'approved' && <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">Admin approval required before adding products.</p>}</div><div className="grid xl:grid-cols-3 gap-6"><div className="xl:col-span-2 bg-white rounded-2xl border overflow-x-auto"><div className="p-4 border-b flex items-center gap-2 font-bold"><Package size={18}/> My Products</div><table className="w-full text-sm"><tbody>{products.map(p=><tr key={p.id} className="border-t"><td className="p-3 flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded-lg object-cover"/>{p.name}</td><td className="p-3 text-right">৳{p.price}</td><td className="p-3 text-center"><button onClick={()=>del(p.id)} className="text-red-600"><Trash2 size={15}/></button></td></tr>)}</tbody></table></div><div className="bg-white rounded-2xl border p-5 h-fit space-y-3"><h3 className="font-bold flex gap-2"><Plus size={16}/> Add Product</h3>{['name','price','image','brand','stock'].map(k=><input key={k} value={(form as any)[k]} onChange={e=>setF(k,e.target.value)} placeholder={k} className="w-full border rounded-xl px-3 py-2 text-sm"/>)}<select value={form.category} onChange={e=>setF('category',e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm">{categories.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select><textarea value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="description" className="w-full border rounded-xl px-3 py-2 text-sm"/><button onClick={save} disabled={seller?.sellerStatus !== 'approved'} className="w-full bg-orange-500 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl">Save Product</button></div></div></main></div>;
}
