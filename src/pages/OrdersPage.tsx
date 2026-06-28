import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock3, CreditCard, Loader2, MessageCircle, Package, PackageCheck, RotateCcw, ShieldX, Star, Truck, X } from 'lucide-react';
import { fetchUserCancellations, fetchUserOrders, fetchUserReturns, fetchUserReviews, submitProductReview } from '../lib/db';
import { api, getToken } from '../lib/api';
import ImageUploader from '../components/forms/ImageUploader';

type OrderTab = 'all' | 'pay' | 'ship' | 'receive' | 'review' | 'returns' | 'cancellations';

const orderId = (order: any) => order.id || order._id;
const itemId = (item: any) => item.id || item._id;
const itemName = (item: any) => item?.product?.name || item?.productSnapshot?.name || 'Product';
const itemImage = (item: any) => item?.product?.image || item?.productSnapshot?.image || item?.productSnapshot?.images?.[0] || 'https://placehold.co/120x120?text=Product';
const itemVariantText = (item: any) => [item?.selectedColor && `Colour: ${item.selectedColor}`, item?.selectedSize && `Size: ${item.selectedSize}`].filter(Boolean).join(' • ');
const isCancelled = (item: any) => item?.cancellationStatus === 'cancelled';
const isUnpaid = (order: any) => ['pending', 'failed', 'unpaid'].includes(String(order.paymentStatus || 'pending').toLowerCase());
const isToShip = (order: any) => ['pending', 'processing'].includes(String(order.status || '').toLowerCase()) && order.status !== 'cancelled';
const isToReceive = (order: any) => ['shipped', 'out_for_delivery', 'out-for-delivery'].includes(String(order.status || '').toLowerCase());
const isDelivered = (order: any) => String(order.status || '').toLowerCase() === 'delivered';

export default function OrdersPage(){
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<OrderTab>((searchParams.get('tab') as OrderTab) || 'all');
  const [orders,setOrders]=useState<any[]>([]);
  const [returns,setReturns]=useState<any[]>([]);
  const [cancellations,setCancellations]=useState<any[]>([]);
  const [reviews,setReviews]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [chat,setChat]=useState<any>(null);
  const [chatMessages,setChatMessages]=useState<any[]>([]);
  const [chatText,setChatText]=useState('');
  const [chatLoading,setChatLoading]=useState(false);
  const [reviewTarget,setReviewTarget]=useState<any>(null);
  const [rating,setRating]=useState(5);
  const [comment,setComment]=useState('');
  const [reviewBusy,setReviewBusy]=useState(false);
  const [reviewPhotos,setReviewPhotos]=useState<string[]>([]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [orderRows, returnRows, cancellationRows, reviewRows] = await Promise.all([
        fetchUserOrders().catch(()=>[]),
        fetchUserReturns().catch(()=>[]),
        fetchUserCancellations().catch(()=>[]),
        fetchUserReviews().catch(()=>[]),
      ]);
      setOrders(orderRows || []);
      setReturns(returnRows || []);
      setCancellations(cancellationRows || []);
      setReviews(reviewRows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{loadOrders()},[]);
  useEffect(()=>{
    const tab = (searchParams.get('tab') as OrderTab) || 'all';
    if (tab !== activeTab) setActiveTab(tab);
  },[searchParams]);

  const setTab = (tab: OrderTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'all' ? {} : { tab });
  };

  const getSeller = (item:any) => item.product?.seller || item.productSnapshot?.seller || null;
  const sellerName = (seller:any) => seller?.name || 'Seller';
  const shopName = (seller:any) => seller?.shopName || 'Seller shop';
  const shopLogo = (seller:any) => seller?.shopLogo || 'https://placehold.co/96x96?text=Shop';

  const reviewedItemIds = useMemo(() => new Set(reviews.map((r:any)=>String(r.orderItem))), [reviews]);

  const flattenedItems = useMemo(() => orders.flatMap((order) => (order.items || []).map((item:any)=>({ order, item }))), [orders]);
  const counts = useMemo(() => {
    const activeItems = flattenedItems.filter(({item})=>!isCancelled(item));
    return {
      all: activeItems.length,
      pay: activeItems.filter(({order})=>isUnpaid(order)).length,
      ship: activeItems.filter(({order})=>isToShip(order)).length,
      receive: activeItems.filter(({order})=>isToReceive(order)).length,
      review: activeItems.filter(({order,item})=>isDelivered(order) && !reviewedItemIds.has(String(itemId(item)))).length,
      returns: returns.length,
      cancellations: cancellations.length,
    };
  }, [flattenedItems, returns.length, cancellations.length, reviewedItemIds]);

  const visibleItems = useMemo(() => {
    const activeItems = flattenedItems.filter(({item})=>!isCancelled(item));
    if (activeTab === 'pay') return activeItems.filter(({order})=>isUnpaid(order));
    if (activeTab === 'ship') return activeItems.filter(({order})=>isToShip(order));
    if (activeTab === 'receive') return activeItems.filter(({order})=>isToReceive(order));
    if (activeTab === 'review') return activeItems.filter(({order,item})=>isDelivered(order) && !reviewedItemIds.has(String(itemId(item))));
    return activeItems;
  }, [activeTab, flattenedItems, reviewedItemIds]);

  const openChat = async (order:any, item:any) => {
    setChat({ order, item });
    setChatText('');
    setChatLoading(true);
    try {
      const res = await api.get<{ messages:any[] }>(`/orders/chats/${orderId(order)}/${itemId(item)}`, getToken('user'));
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
    const res = await api.post<{ message:any }>(`/orders/chats/${orderId(chat.order)}/${itemId(chat.item)}`, { message: text }, getToken('user'));
    setChatMessages((prev)=>[...prev, res.message]);
  };

  const saveReview = async () => {
    if (!reviewTarget) return;
    setReviewBusy(true);
    try {
      await submitProductReview({ orderId: orderId(reviewTarget.order), orderItemId: itemId(reviewTarget.item), rating, comment, photos: reviewPhotos });
      setReviewTarget(null);
      setComment('');
      setRating(5);
      setReviewPhotos([]);
      await loadOrders();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setReviewBusy(false);
    }
  };

  const tabs: Array<{key: OrderTab; label: string; icon: React.ReactNode; count: number}> = [
    { key: 'pay', label: 'To Pay', icon: <CreditCard size={18}/>, count: counts.pay },
    { key: 'ship', label: 'To Ship', icon: <Truck size={18}/>, count: counts.ship },
    { key: 'receive', label: 'To Receive', icon: <PackageCheck size={18}/>, count: counts.receive },
    { key: 'review', label: 'To Review', icon: <Star size={18}/>, count: counts.review },
    { key: 'returns', label: 'Returns', icon: <RotateCcw size={18}/>, count: counts.returns },
    { key: 'cancellations', label: 'Cancellations', icon: <ShieldX size={18}/>, count: counts.cancellations },
  ];

  return <div className="max-w-6xl mx-auto px-4 py-8">
    <Link to="/account" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Back to profile</Link>
    <div className="flex flex-wrap justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Package/> My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track payment, shipping, receiving, reviews, returns, and cancellations.</p>
      </div>
      <button onClick={()=>setTab('all')} className={`h-fit rounded-xl px-4 py-2 text-sm font-bold border ${activeTab === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'}`}>All Orders ({counts.all})</button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {tabs.map((tab)=>(
        <button key={tab.key} onClick={()=>setTab(tab.key)} className={`relative rounded-2xl border p-4 text-left transition ${activeTab === tab.key ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white hover:border-orange-200'}`}>
          <div className="flex items-center justify-between gap-2"><span>{tab.icon}</span><span className={`text-xs rounded-full px-2 py-0.5 font-black ${activeTab === tab.key ? 'bg-white text-orange-600' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span></div>
          <p className="font-black mt-3 text-sm">{tab.label}</p>
        </button>
      ))}
    </div>

    {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div> : activeTab === 'returns' ? (
      <StatusPanel title="Return Products" empty="No return requests yet." action={<Link to="/returns" className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Request / Manage Returns</Link>}>
        {returns.map((r:any)=><div key={r.id||r._id} className="bg-white border rounded-2xl p-5"><div className="flex justify-between gap-3"><div><p className="font-black">{r.product?.name || 'Product'}</p><p className="text-xs text-gray-400">{r.order?.orderNumber || 'Order'} • {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</p></div><span className="h-fit px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold capitalize">{r.status}</span></div><p className="text-sm text-gray-600 mt-2">Reason: {r.reason}</p></div>)}
      </StatusPanel>
    ) : activeTab === 'cancellations' ? (
      <StatusPanel title="Cancellation Products" empty="No cancelled products yet." action={<Link to="/cancellations" className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Cancel / View Cancellations</Link>}>
        {cancellations.map((c:any)=><div key={c.id||c._id} className="bg-white border rounded-2xl p-5"><div className="flex justify-between gap-3"><div><p className="font-black">{c.product?.name || 'Product'}</p><p className="text-xs text-gray-400">{c.order?.orderNumber || 'Order'} • {c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : ''}</p></div><span className="h-fit px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-bold capitalize">{c.status}</span></div><p className="text-sm text-gray-600 mt-2">Reason: {c.reason || '-'}</p></div>)}
      </StatusPanel>
    ) : visibleItems.length === 0 ? (
      <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">No products found in this section.</div>
    ) : (
      <div className="space-y-4">
        {visibleItems.map(({order,item})=>{
          const seller = getSeller(item);
          const key = `${orderId(order)}-${itemId(item)}`;
          return <div key={key} className="bg-white border rounded-2xl p-5">
            <div className="flex flex-wrap gap-3 justify-between border-b pb-3 mb-4"><div><p className="font-black">{order.orderNumber}</p><p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2 justify-end"><span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold capitalize">Order: {order.status}</span><span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold capitalize">Payment: {order.paymentStatus || 'pending'}</span></div></div>
            <div className="flex flex-wrap items-center gap-3">
              <img src={itemImage(item)} className="w-16 h-16 rounded-xl object-cover bg-gray-100"/>
              <div className="flex-1 min-w-[200px]"><p className="font-black text-sm">{itemName(item)}</p><p className="text-xs text-gray-500">Qty: {item.quantity} • ৳{Number(item.totalPrice||0).toLocaleString()}</p>{itemVariantText(item) && <p className="text-xs text-orange-600 font-semibold mt-0.5">{itemVariantText(item)}</p>}{seller && <p className="text-xs text-gray-400 mt-1">Shop: {shopName(seller)} • Seller: {sellerName(seller)}</p>}</div>
              <div className="flex flex-wrap gap-2 justify-end">
                {activeTab === 'pay' && <button onClick={()=>alert('Payment gateway is not connected yet. This button is ready for bKash/Nagad/card integration.')} className="rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-bold">Pay Now</button>}
                {activeTab === 'ship' && <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 text-blue-700 px-4 py-2 text-sm font-bold"><Clock3 size={16}/> Waiting for shipment</span>}
                {activeTab === 'receive' && <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 text-green-700 px-4 py-2 text-sm font-bold"><Truck size={16}/> On the way</span>}
                {activeTab === 'review' && <button onClick={()=>{ setReviewTarget({order,item}); setReviewPhotos([]); setComment(''); setRating(5); }} className="rounded-xl bg-yellow-500 text-white px-4 py-2 text-sm font-bold inline-flex gap-2 items-center"><Star size={16}/> Review</button>}
                {seller && <button onClick={()=>openChat(order,item)} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-bold"><MessageCircle size={16}/> Message Seller</button>}
              </div>
            </div>
            {seller && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 border p-3"><img src={shopLogo(seller)} className="w-11 h-11 rounded-full object-cover bg-gray-100"/><div className="flex-1 min-w-[180px]"><p className="text-sm font-black">{shopName(seller)}</p><p className="text-xs text-gray-500">Seller: {sellerName(seller)}</p></div></div>}
          </div>
        })}
      </div>
    )}

    {chat && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3"><img src={shopLogo(getSeller(chat.item))} className="w-10 h-10 rounded-full object-cover bg-gray-100"/><div><h3 className="font-black flex items-center gap-2"><MessageCircle size={18}/> {shopName(getSeller(chat.item))}</h3><p className="text-xs text-gray-500">Seller: {sellerName(getSeller(chat.item))} • {itemName(chat.item)}</p></div></div>
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

    {reviewTarget && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <div className="flex justify-between items-start gap-3 mb-4"><div><h3 className="text-lg font-black">Review Product</h3><p className="text-sm text-gray-500">{itemName(reviewTarget.item)}</p></div><button onClick={()=>{setReviewTarget(null); setReviewPhotos([]);}}><X /></button></div>
        <div className="flex gap-1 mb-4">{[1,2,3,4,5].map((n)=><button key={n} onClick={()=>setRating(n)}><Star className={n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} /></button>)}</div>
        <textarea value={comment} onChange={(e)=>setComment(e.target.value)} className="w-full border rounded-xl p-3 text-sm min-h-28" placeholder="Write your product review..." />
        <div className="mt-4">
          <ImageUploader
            label="Review photo"
            helperText="Upload or capture a real product photo for this review"
            value=""
            token={getToken('user')}
            onChange={(url)=>setReviewPhotos((prev)=>prev.includes(url) ? prev : [...prev, url].slice(0, 6))}
          />
          {reviewPhotos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{reviewPhotos.map((url)=><div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border bg-gray-50"><img src={url} className="w-full h-full object-cover"/><button type="button" onClick={()=>setReviewPhotos((prev)=>prev.filter((x)=>x!==url))} className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center"><X size={13}/></button></div>)}</div>}
        </div>
        <button disabled={reviewBusy} onClick={saveReview} className="mt-4 w-full bg-orange-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2">{reviewBusy && <Loader2 className="animate-spin" size={16}/>} Submit Review</button>
      </div>
    </div>}
  </div>
}

function StatusPanel({ title, empty, action, children }: { title: string; empty: string; action: React.ReactNode; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return <div>
    <div className="flex flex-wrap justify-between gap-3 items-center mb-4"><h2 className="font-black text-xl">{title}</h2>{action}</div>
    {!hasChildren ? <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">{empty}</div> : <div className="space-y-4">{children}</div>}
  </div>;
}
