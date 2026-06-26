import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, TicketPercent } from 'lucide-react';
import { api } from '../lib/api';

export default function CouponsPage(){
 const [promos,setPromos]=useState<any[]>([]); const [copied,setCopied]=useState('');
 useEffect(()=>{api.get<{promos:any[]}>('/promos').then(r=>setPromos(r.promos)).catch(()=>setPromos([]))},[]);
 const copy=(code:string)=>{navigator.clipboard?.writeText(code); setCopied(code); setTimeout(()=>setCopied(''),1500)};
 return <div className="max-w-5xl mx-auto px-4 py-8"><Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link><h1 className="text-2xl font-black mb-5 flex items-center gap-2"><TicketPercent/> Vouchers & Coupons</h1>{promos.length===0?<div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No active coupons right now.</div>:<div className="grid md:grid-cols-2 gap-4">{promos.map(p=><div key={p.id} className="bg-white border rounded-2xl p-5 flex justify-between gap-3"><div><p className="text-xs text-gray-500">Coupon code</p><p className="text-2xl font-black tracking-wider text-orange-600">{p.code}</p><p className="text-sm text-gray-600 mt-1">{p.description || (p.discountType==='percentage'?`${p.discountValue}% off`:`৳${p.discountValue} off`)}</p><p className="text-xs text-gray-400 mt-2">Minimum order: ৳{Number(p.minOrderAmount||0).toLocaleString()}</p></div><button onClick={()=>copy(p.code)} className="h-fit px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center gap-2"><Copy size={15}/>{copied===p.code?'Copied':'Copy'}</button></div>)}</div>}</div>
}
