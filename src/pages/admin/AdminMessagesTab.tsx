import React, { useEffect, useState } from 'react';
import { MessageCircle, RefreshCcw, X } from 'lucide-react';
import { api, getToken } from '../../lib/api';

const personName = (user: any) => user?.fullName || user?.name || 'Customer';
const shopName = (seller: any) => seller?.shopName || seller?.name || 'Seller';
const productName = (product: any) => product?.name || 'Product';
const productImage = (product: any) => product?.image || product?.images?.[0] || 'https://placehold.co/80x80?text=Product';

export default function AdminMessagesTab() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ conversations: any[] }>('/admin/messages', getToken('admin'));
      setConversations(res.conversations || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openConversation = async (conversation: any) => {
    setSelected(conversation);
    setMessageLoading(true);
    try {
      const orderId = conversation.order?.id || conversation.order?._id || conversation.order;
      const itemId = conversation.orderItem?.id || conversation.orderItem?._id || conversation.orderItem;
      const res = await api.get<{ messages: any[] }>(`/admin/messages/${orderId}/${itemId}`, getToken('admin'));
      setMessages(res.messages || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not load messages');
      setSelected(null);
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="p-5 border-b flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2"><MessageCircle size={20}/> Customer & Seller Messages</h2>
          <p className="text-sm text-gray-500">Admin can monitor all customer-seller conversations created from ordered products.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><RefreshCcw size={15}/> Refresh</button>
      </div>

      {loading ? <div className="p-8 text-center text-gray-500">Loading messages...</div> : conversations.length === 0 ? <div className="p-8 text-center text-gray-500">No customer-seller messages yet.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Seller</th>
                <th className="p-3 text-left">Last message</th>
                <th className="p-3 text-center">Messages</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="flex items-center gap-2 min-w-[220px]">
                      <img src={productImage(c.product)} className="w-11 h-11 rounded-lg object-cover bg-gray-100" />
                      <div>
                        <p className="font-bold">{productName(c.product)}</p>
                        <p className="text-xs text-gray-500">{c.order?.orderNumber || 'Order'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><b>{personName(c.customer)}</b><p className="text-xs text-gray-500">{c.customer?.email || ''}</p></td>
                  <td className="p-3"><b>{shopName(c.seller)}</b><p className="text-xs text-gray-500">{c.seller?.name || ''}</p></td>
                  <td className="p-3 max-w-xs"><p className="line-clamp-2">{c.lastMessage?.message}</p><p className="text-xs text-gray-400 mt-1">{c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleString() : ''}</p></td>
                  <td className="p-3 text-center"><span className="inline-flex rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold">{c.messageCount}</span></td>
                  <td className="p-3 text-center"><button onClick={() => openConversation(c)} className="rounded-xl bg-blue-600 text-white px-3 py-2 font-bold">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-start gap-3">
            <div>
              <h3 className="font-black">Conversation Details</h3>
              <p className="text-sm text-gray-500">{personName(selected.customer)} ↔ {shopName(selected.seller)}</p>
              <p className="text-xs text-gray-400">{selected.order?.orderNumber} • {productName(selected.product)}</p>
            </div>
            <button onClick={() => setSelected(null)}><X /></button>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-2 bg-gray-50">
            {messageLoading ? <p className="text-center text-gray-500 mt-20">Loading conversation...</p> : messages.map((m) => (
              <div key={m.id || m._id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'seller' ? 'ml-auto bg-orange-500 text-white' : 'bg-white border text-gray-700'}`}>
                <p className="text-[11px] font-bold mb-1 opacity-80">{m.senderType === 'seller' ? shopName(m.seller) : personName(m.customer)}</p>
                <p>{m.message}</p>
                <p className={`text-[10px] mt-1 ${m.senderType === 'seller' ? 'text-orange-100' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
              </div>
            ))}
          </div>
          <div className="p-3 border-t text-xs text-gray-500">Admin view only. Messages cannot be sent from this screen.</div>
        </div>
      </div>}
    </div>
  );
}
