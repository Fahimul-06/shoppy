import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { fetchUserOrders } from '../lib/db';

export default function ReturnsPage(){
 const [orders,setOrders]=useState<any[]>([]); const [msg,setMsg]=useState('');
 useEffect(()=>{fetchUserOrders().then(setOrders).catch(()=>setOrders([]))},[]);
 const delivered=orders.filter(o=>o.status==='delivered');
 return <div className="max-w-5xl mx-auto px-4 py-8"><Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link><h1 className="text-2xl font-black mb-5 flex items-center gap-2"><RotateCcw/> Returns</h1>{msg&&<p className="mb-4 bg-green-50 border border-green-100 text-green-700 rounded-xl p-3 text-sm">{msg}</p>}{delivered.length===0?<div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No delivered orders available for return request.</div>:<div className="space-y-4">{delivered.map(o=><div key={o.id} className="bg-white border rounded-2xl p-5 flex justify-between gap-4"><div><p className="font-black">{o.orderNumber}</p><p className="text-xs text-gray-400">Delivered order</p><p className="text-sm text-gray-600 mt-2">Total: ৳{Number(o.totalAmount||0).toLocaleString()}</p></div><button onClick={()=>setMsg(`Return request noted for ${o.orderNumber}. Admin will review it.`)} className="h-fit px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm">Request Return</button></div>)}</div>}</div>
}
