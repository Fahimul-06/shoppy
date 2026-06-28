import React, { useEffect, useState } from 'react';
import { Headphones, Loader2, MessageCircle, Send, UserRound } from 'lucide-react';
import { api, getToken } from '../../lib/api';

type Conversation = {
  id: string;
  customer?: any;
  lastMessage?: any;
  messageCount?: number;
  unreadForAdmin?: number;
};

export default function AdminCustomerCareTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = async () => {
    const res = await api.get<{ conversations: Conversation[] }>('/admin/customer-care', getToken('admin'));
    setConversations(res.conversations || []);
  };

  useEffect(() => { loadConversations().catch(() => setConversations([])); }, []);

  const openConversation = async (conversation: Conversation) => {
    setSelected(conversation);
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ customer: any; messages: any[] }>(`/admin/customer-care/${conversation.id}`, getToken('admin'));
      setCustomer(res.customer);
      setMessages(res.messages || []);
      loadConversations().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !text.trim() || sending) return;
    const clean = text.trim();
    setText('');
    setSending(true);
    setError('');
    try {
      const res = await api.post<{ message: any }>(`/admin/customer-care/${selected.id}`, { message: clean }, getToken('admin'));
      setMessages((prev) => [...prev, res.message]);
      loadConversations().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply could not be sent');
      setText(clean);
    } finally {
      setSending(false);
    }
  };

  const nameOf = (c: any) => c?.fullName || c?.name || 'Customer';

  return (
    <div className="grid lg:grid-cols-[360px,1fr] gap-5">
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-black flex items-center gap-2"><Headphones /> Customer Care</h2>
          <p className="text-sm text-gray-500">Live support messages from customers.</p>
        </div>
        <div className="divide-y max-h-[650px] overflow-y-auto">
          {conversations.length === 0 ? <div className="p-8 text-center text-gray-500">No customer care messages yet.</div> : conversations.map((c) => (
            <button key={c.id} onClick={() => openConversation(c)} className={`w-full p-4 text-left hover:bg-orange-50 ${selected?.id === c.id ? 'bg-orange-50' : ''}`}>
              <div className="flex gap-3">
                <img src={c.customer?.profilePhoto || 'https://placehold.co/80x80?text=User'} className="w-11 h-11 rounded-full object-cover bg-gray-100" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black truncate">{nameOf(c.customer)}</p>
                    {(c.unreadForAdmin || 0) > 0 && <span className="bg-red-600 text-white text-xs rounded-full min-w-5 h-5 px-1 grid place-items-center">{c.unreadForAdmin}</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.customer?.email || c.customer?.phone || 'Customer account'}</p>
                  <p className="text-sm text-gray-600 truncate mt-1">{c.lastMessage?.message || 'No message'}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleString() : ''} • {c.messageCount || 0} message(s)</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden min-h-[650px] flex flex-col">
        {!selected ? (
          <div className="flex-1 grid place-items-center text-center text-gray-500 p-8">
            <div><MessageCircle className="mx-auto mb-3" size={40}/><p className="font-bold">Select a customer conversation</p><p className="text-sm">Admin/customer-care can reply from here.</p></div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <img src={customer?.profilePhoto || selected.customer?.profilePhoto || 'https://placehold.co/80x80?text=User'} className="w-12 h-12 rounded-full object-cover bg-gray-100" />
              <div>
                <h3 className="font-black flex gap-2 items-center"><UserRound size={18}/> {nameOf(customer || selected.customer)}</h3>
                <p className="text-xs text-gray-500">{customer?.email || selected.customer?.email || ''}{(customer?.phone || selected.customer?.phone) ? ` • ${customer?.phone || selected.customer?.phone}` : ''}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {loading ? <div className="h-full grid place-items-center"><Loader2 className="animate-spin text-orange-500" /></div> : messages.length === 0 ? <p className="text-center text-gray-500 mt-20">No messages yet.</p> : messages.map((m) => (
                <div key={m.id || m._id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'admin' ? 'ml-auto bg-slate-950 text-white' : 'bg-white border text-gray-700'}`}>
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-1 ${m.senderType === 'admin' ? 'text-slate-300' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>

            {error && <p className="px-4 pt-2 text-xs text-red-600">{error}</p>}
            <div className="p-3 border-t flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Reply as customer care..." />
              <button disabled={sending || !text.trim()} onClick={sendReply} className="bg-slate-950 disabled:bg-gray-300 text-white rounded-xl px-4 font-bold flex items-center gap-2">{sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
