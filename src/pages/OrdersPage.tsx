import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, Package, X } from 'lucide-react';
import { fetchUserOrders } from '../lib/db';
import { api, getToken } from '../lib/api';

export default function OrdersPage(){
  const [orders,setOrders]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [chat,setChat]=useState<any>(null);
  const [chatMessages,setChatMessages]=useState<any[]>([]);
  const [chatText,setChatText]=useState('');
  const [chatLoading,setChatLoading]=useState(false);

  const loadOrders = () => fetchUserOrders().then(setOrders).catch(()=>setOrders([])).finally(()=>setLoading(false));
  useEffect(()=>{loadOrders()},[]);

  const getSeller = (item:any) => item.product?.seller || item.productSnapshot?.seller || null;
  const sellerName = (seller:any) => seller?.name || 'Seller';
  const shopName = (seller:any) => seller?.shopName || 'Seller shop';
  const shopLogo = (seller:any) => seller?.shopLogo || 'https://placehold.co/96x96?text=Shop';

  const openChat = async (order:any, item:any) => {
    setChat({ order, item });
    setChatText('');
    setChatLoading(true);
    try {
      const res = await api.get<{ messages:any[] }>(`/orders/chats/${order.id || order._id}/${item.id || item._id}`, getToken('user'));
      setChatMessages(res.messages || []);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open chat');
      setChat(null);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chat || !chatText.trim()) return;
    const text = chatText.trim();
    setChatText('');
    const res = await api.post<{ message:any }>(`/orders/chats/${chat.order.id || chat.order._id}/${chat.item.id || chat.item._id}`, { message: text }, getToken('user'));
    setChatMessages((prev)=>[...prev, res.message]);
  };

  return <div className="max-w-5xl mx-auto px-4 py-8">
    <Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link>
    <h1 className="text-2xl font-black mb-5 flex items-center gap-2"><Package/> My Orders</h1>
    {loading?<p>Loading orders...</p>:orders.length===0?<div className="bg-white border rounded-2xl p-8 text-center text-gray-500">No orders yet.</div>:<div className="space-y-4">{orders.map(o=><div key={o.id || o._id} className="bg-white border rounded-2xl p-5"><div className="flex flex-wrap gap-3 justify-between"><div><p className="font-black">{o.orderNumber}</p><p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-black">৳{Number(o.totalAmount||0).toLocaleString()}</p><p className="text-xs capitalize text-gray-500">{o.status}</p></div></div><div className="mt-4 grid gap-2">{(o.items||[]).map((it:any)=>{ const seller = getSeller(it); return <div key={it._id||it.id} className="bg-gray-50 rounded-xl p-3"><div className="flex flex-wrap items-center gap-3"><img src={it.product?.image || it.productSnapshot?.image||'/placeholder.png'} className="w-12 h-12 rounded-lg object-cover bg-white"/><div className="flex-1 min-w-[180px]"><p className="text-sm font-bold">{it.product?.name || it.productSnapshot?.name}</p><p className="text-xs text-gray-500">Qty: {it.quantity}</p></div><p className="font-bold text-sm">৳{Number(it.totalPrice||0).toLocaleString()}</p></div>{seller && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white border p-3"><img src={shopLogo(seller)} className="w-11 h-11 rounded-full object-cover bg-gray-100"/><div className="flex-1 min-w-[180px]"><p className="text-sm font-black">{shopName(seller)}</p><p className="text-xs text-gray-500">Seller: {sellerName(seller)}</p></div><button onClick={()=>openChat(o,it)} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-3 py-2 text-sm font-bold"><MessageCircle size={16}/> Send message</button></div>}</div>})}</div></div>)}</div>}

    {chat && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3"><img src={shopLogo(getSeller(chat.item))} className="w-10 h-10 rounded-full object-cover bg-gray-100"/><div><h3 className="font-black flex items-center gap-2"><MessageCircle size={18}/> {shopName(getSeller(chat.item))}</h3><p className="text-xs text-gray-500">Seller: {sellerName(getSeller(chat.item))} • {chat.item?.product?.name || chat.item?.productSnapshot?.name}</p></div></div>
          <button onClick={()=>setChat(null)}><X /></button>
        </div>
        <div className="h-80 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {chatLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div> : chatMessages.length===0 ? <p className="text-center text-gray-500 text-sm mt-20">No messages yet. Send the first message to the seller.</p> : chatMessages.map((m)=><div key={m.id || m._id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'customer' ? 'ml-auto bg-orange-500 text-white' : 'bg-white border text-gray-700'}`}><p>{m.message}</p><p className={`text-[10px] mt-1 ${m.senderType === 'customer' ? 'text-orange-100' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p></div>)}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input value={chatText} onChange={(e)=>setChatText(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') sendChat(); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Write message..." />
          <button onClick={sendChat} className="bg-orange-500 text-white rounded-xl px-4 font-bold">Send</button>
        </div>
      </div>
    </div>}
  </div>
}
