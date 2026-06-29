import React, { useEffect, useState } from 'react';
import { Bike, Headphones, Loader2, MessageCircle, Send, UserRound } from 'lucide-react';
import { api, getToken } from '../../lib/api';

type Conversation = {
  id: string;
  customer?: any;
  deliveryMan?: any;
  lastMessage?: any;
  messageCount?: number;
  unreadForAdmin?: number;
};

type Mode = 'customer' | 'delivery';

export default function AdminCustomerCareTab() {
  const [mode, setMode] = useState<Mode>('customer');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [person, setPerson] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = async (targetMode = mode) => {
    const endpoint = targetMode === 'delivery' ? '/admin/delivery-support' : '/admin/customer-care';
    const res = await api.get<{ conversations: Conversation[] }>(endpoint, getToken('admin'));
    setConversations(res.conversations || []);
  };

  useEffect(() => { loadConversations().catch(() => setConversations([])); }, [mode]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setSelected(null);
    setMessages([]);
    setPerson(null);
    setError('');
  };

  const openConversation = async (conversation: Conversation) => {
    setSelected(conversation);
    setLoading(true);
    setError('');
    try {
      if (mode === 'delivery') {
        const res = await api.get<{ deliveryMan: any; messages: any[] }>(`/admin/delivery-support/${conversation.id}`, getToken('admin'));
        setPerson(res.deliveryMan);
        setMessages(res.messages || []);
      } else {
        const res = await api.get<{ customer: any; messages: any[] }>(`/admin/customer-care/${conversation.id}`, getToken('admin'));
        setPerson(res.customer);
        setMessages(res.messages || []);
      }
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
      const endpoint = mode === 'delivery' ? `/admin/delivery-support/${selected.id}` : `/admin/customer-care/${selected.id}`;
      const res = await api.post<{ message: any }>(endpoint, { message: clean, language: mode === 'delivery' ? 'bn' : 'en' }, getToken('admin'));
      setMessages((prev) => [...prev, res.message]);
      loadConversations().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply could not be sent');
      setText(clean);
    } finally {
      setSending(false);
    }
  };

  const nameOf = (c: any) => c?.fullName || c?.name || 'User';
  const currentPerson = person || selected?.customer || selected?.deliveryMan;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border p-3 flex flex-wrap gap-2">
        <button onClick={()=>changeMode('customer')} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${mode==='customer'?'bg-slate-950 text-white':'bg-gray-100 text-gray-700'}`}><Headphones size={16}/> Customer Support</button>
        <button onClick={()=>changeMode('delivery')} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${mode==='delivery'?'bg-blue-600 text-white':'bg-blue-50 text-blue-700'}`}><Bike size={16}/> Delivery Support বাংলা</button>
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-5">
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-black flex items-center gap-2">{mode === 'delivery' ? <Bike /> : <Headphones />} {mode === 'delivery' ? 'Delivery Support' : 'Customer Care'}</h2>
            <p className="text-sm text-gray-500">{mode === 'delivery' ? 'Bangla support messages from delivery men.' : 'Live support messages from customers.'}</p>
          </div>
          <div className="divide-y max-h-[650px] overflow-y-auto">
            {conversations.length === 0 ? <div className="p-8 text-center text-gray-500">No {mode === 'delivery' ? 'delivery support' : 'customer care'} messages yet.</div> : conversations.map((c) => {
              const p = mode === 'delivery' ? c.deliveryMan : c.customer;
              return <button key={c.id} onClick={() => openConversation(c)} className={`w-full p-4 text-left hover:bg-orange-50 ${selected?.id === c.id ? 'bg-orange-50' : ''}`}>
                <div className="flex gap-3">
                  {mode === 'delivery' ? <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 grid place-items-center"><Bike size={20}/></div> : <img src={p?.profilePhoto || 'https://placehold.co/80x80?text=User'} className="w-11 h-11 rounded-full object-cover bg-gray-100" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="font-black truncate">{nameOf(p)}</p>{(c.unreadForAdmin || 0) > 0 && <span className="bg-red-600 text-white text-xs rounded-full min-w-5 h-5 px-1 grid place-items-center">{c.unreadForAdmin}</span>}</div>
                    <p className="text-xs text-gray-500 truncate">{mode === 'delivery' ? `ID: ${p?.deliveryCode || '------'} • ${p?.phone || ''}` : (p?.email || p?.phone || 'Customer account')}</p>
                    <p className="text-sm text-gray-600 truncate mt-1">{c.lastMessage?.message || 'No message'}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleString() : ''} • {c.messageCount || 0} message(s)</p>
                  </div>
                </div>
              </button>;
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden min-h-[650px] flex flex-col">
          {!selected ? (
            <div className="flex-1 grid place-items-center text-center text-gray-500 p-8"><div><MessageCircle className="mx-auto mb-3" size={40}/><p className="font-bold">Select a {mode === 'delivery' ? 'delivery' : 'customer'} conversation</p><p className="text-sm">Support team can reply from here.</p></div></div>
          ) : (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                {mode === 'delivery' ? <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 grid place-items-center"><Bike size={22}/></div> : <img src={currentPerson?.profilePhoto || 'https://placehold.co/80x80?text=User'} className="w-12 h-12 rounded-full object-cover bg-gray-100" />}
                <div>
                  <h3 className="font-black flex gap-2 items-center">{mode === 'delivery' ? <Bike size={18}/> : <UserRound size={18}/>} {nameOf(currentPerson)}</h3>
                  <p className="text-xs text-gray-500">{mode === 'delivery' ? `ID: ${currentPerson?.deliveryCode || '------'} • ${currentPerson?.phone || ''}` : `${currentPerson?.email || ''}${currentPerson?.phone ? ` • ${currentPerson.phone}` : ''}`}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {loading ? <div className="h-full grid place-items-center"><Loader2 className="animate-spin text-orange-500" /></div> : messages.length === 0 ? <p className="text-center text-gray-500 mt-20">No messages yet.</p> : messages.map((m) => {
                  const isAdmin = m.senderType === 'admin';
                  return <div key={m.id || m._id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'ml-auto bg-slate-950 text-white' : 'bg-white border text-gray-700'}`}><p>{m.message}</p><p className={`text-[10px] mt-1 ${isAdmin ? 'text-slate-300' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p></div>;
                })}
              </div>

              {error && <p className="px-4 pt-2 text-xs text-red-600">{error}</p>}
              <div className="p-3 border-t flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder={mode === 'delivery' ? 'বাংলায় রিপ্লাই লিখুন...' : 'Reply as customer care...'} />
                <button disabled={sending || !text.trim()} onClick={sendReply} className="bg-slate-950 disabled:bg-gray-300 text-white rounded-xl px-4 font-bold flex items-center gap-2">{sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
