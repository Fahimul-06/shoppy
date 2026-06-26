import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { fetchUserOrders } from '../lib/db';

export default function OrdersPage(){
  const [orders,setOrders]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{fetchUserOrders().then(setOrders).catch(()=>setOrders([])).finally(()=>setLoading(false))},[]);
  return <div className="max-w-5xl mx-auto px-4 py-8"><Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link><h1 className="text-2xl font-black mb-5 flex items-center gap-2"><Package/> My Orders</h1>
  {loading?<p>Loading orders...</p>:orders.length===0?<div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No orders yet.</div>:<div className="space-y-4">{orders.map(o=><div key={o.id} className="bg-white border rounded-2xl p-5"><div className="flex flex-wrap gap-3 justify-between"><div><p className="font-black">{o.orderNumber}</p><p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-black">৳{Number(o.totalAmount||0).toLocaleString()}</p><p className="text-xs capitalize text-gray-500">{o.status}</p></div></div><div className="mt-4 grid gap-2">{(o.items||[]).map((it:any)=><div key={it._id||it.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"><img src={it.productSnapshot?.image||'/placeholder.png'} className="w-12 h-12 rounded-lg object-cover bg-white"/><div className="flex-1"><p className="text-sm font-bold">{it.productSnapshot?.name}</p><p className="text-xs text-gray-500">Qty: {it.quantity}</p></div><p className="font-bold text-sm">৳{Number(it.totalPrice||0).toLocaleString()}</p></div>)}</div></div>)}</div>}
  </div>
}
