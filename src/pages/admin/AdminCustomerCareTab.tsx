import React, { useEffect, useRef, useState } from 'react';
import { Bike, ExternalLink, Headphones, Loader2, MessageCircle, Send, UserRound, Video, Volume2 } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { createRealtimeSocket, socketAck } from '../../lib/socket';
import type { Socket } from 'socket.io-client';

type Conversation = {
  id: string;
  customer?: any;
  deliveryMan?: any;
  lastMessage?: any;
  messageCount?: number;
  unreadForAdmin?: number;
};

type Mode = 'customer' | 'delivery';

function playIncomingCallSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    gain.connect(ctx.destination);
    [0, 0.22, 0.44, 0.88, 1.1, 1.32].forEach((delay) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 740;
      osc.connect(gain);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.14);
    });
    window.setTimeout(() => ctx.close?.(), 1800);
  } catch {
    // Browser may block sound until enabled by user click.
  }
}

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
  const [callSoundEnabled, setCallSoundEnabled] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedRef = useRef<Conversation | null>(null);
  const modeRef = useRef<Mode>('customer');

  const mergeMessages = (incoming: any[]) => {
    setMessages((prev) => {
      const map = new Map<string, any>();
      [...prev, ...incoming].forEach((m) => map.set(String(m.id || m._id || `${m.createdAt}-${m.message}`), m));
      return Array.from(map.values()).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    });
  };

  const loadConversations = async (targetMode = mode) => {
    const endpoint = targetMode === 'delivery' ? '/admin/delivery-support' : '/admin/customer-care';
    const res = await api.get<{ conversations: Conversation[] }>(endpoint, getToken('admin'));
    const nextConversations = res.conversations || [];
    if (targetMode === 'delivery' && callSoundEnabled) {
      const hasUnreadCall = nextConversations.some((c) => c.lastMessage?.messageType === 'call' && c.lastMessage?.callStatus === 'ringing' && (c.unreadForAdmin || 0) > 0);
      if (hasUnreadCall) playIncomingCallSound();
    }
    setConversations(nextConversations);
  };

  useEffect(() => { modeRef.current = mode; loadConversations().catch(() => setConversations([])); }, [mode, callSoundEnabled]);
  useEffect(() => {
    if (mode !== 'delivery') return;
    const timer = window.setInterval(() => loadConversations('delivery').catch(() => {}), 30000);
    return () => window.clearInterval(timer);
  }, [mode, callSoundEnabled]);

  useEffect(() => {
    const token = getToken('admin');
    if (!token) return;
    const socket = createRealtimeSocket('admin');
    socketRef.current = socket;
    socket.on('delivery-support:refresh', () => {
      if (modeRef.current === 'delivery') loadConversations('delivery').catch(() => {});
    });
    socket.on('delivery-support:call', () => {
      if (callSoundEnabled) playIncomingCallSound();
      if (modeRef.current === 'delivery') loadConversations('delivery').catch(() => {});
    });
    socket.on('delivery-support:message', (message: any) => {
      if (modeRef.current !== 'delivery') return;
      const deliveryId = String(message.deliveryMan?._id || message.deliveryMan || '');
      if (selectedRef.current?.id && deliveryId === String(selectedRef.current.id)) mergeMessages([message]);
      loadConversations('delivery').catch(() => {});
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [callSoundEnabled]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setSelected(null);
    selectedRef.current = null;
    setMessages([]);
    setPerson(null);
    setError('');
  };

  const openConversation = async (conversation: Conversation) => {
    setSelected(conversation);
    selectedRef.current = conversation;
    setLoading(true);
    setError('');
    try {
      if (mode === 'delivery') {
        const res = await api.get<{ deliveryMan: any; messages: any[] }>(`/admin/delivery-support/${conversation.id}`, getToken('admin'));
        setPerson(res.deliveryMan);
        setMessages(res.messages || []);
        socketRef.current?.emit('delivery-support:join', { deliveryManId: conversation.id });
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


  const joinCall = async (message: any) => {
    if (!selected || !message?.callUrl) return;
    window.open(`${message.callUrl}?role=admin`, '_blank', 'noopener,noreferrer');
    try {
      const res = await api.patch<{ message: any }>(`/admin/delivery-support/${selected.id}/call/${message.id || message._id}/status`, { status: 'joined' }, getToken('admin'));
      setMessages((prev) => prev.map((m) => String(m.id || m._id) === String(message.id || message._id) ? res.message : m));
      loadConversations().catch(() => {});
    } catch {
      // Call link is still opened even if status update fails.
    }
  };

  const sendReply = async () => {
    if (!selected || !text.trim() || sending) return;
    const clean = text.trim();
    setText('');
    setSending(true);
    setError('');
    try {
      if (mode === 'delivery' && socketRef.current?.connected) {
        const res = await socketAck<{ message: any }>(socketRef.current, 'delivery-support:admin-message', { deliveryManId: selected.id, message: clean, language: 'bn' });
        mergeMessages([res.message]);
      } else {
        const endpoint = mode === 'delivery' ? `/admin/delivery-support/${selected.id}` : `/admin/customer-care/${selected.id}`;
        const res = await api.post<{ message: any }>(endpoint, { message: clean, language: mode === 'delivery' ? 'bn' : 'en' }, getToken('admin'));
        mergeMessages([res.message]);
      }
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
        {mode === 'delivery' && <button onClick={()=>{ setCallSoundEnabled(true); playIncomingCallSound(); }} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${callSoundEnabled?'bg-green-600 text-white':'bg-red-50 text-red-700 border border-red-100'}`}><Volume2 size={16}/>{callSoundEnabled ? 'Call Sound On' : 'Enable Call Sound'}</button>}
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
                    <p className="text-sm text-gray-600 truncate mt-1">{c.lastMessage?.messageType === 'call' ? '📞 Internet call request' : (c.lastMessage?.message || 'No message')}</p>
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
                  const isCall = m.messageType === 'call';
                  return <div key={m.id || m._id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'ml-auto bg-slate-950 text-white' : 'bg-white border text-gray-700'}`}>
                    {isCall ? <div className="space-y-2"><p className="font-black flex items-center gap-2"><Video size={15}/> Internet call request</p><p>{m.message}</p><div className="flex flex-wrap gap-2 items-center"><button onClick={() => joinCall(m)} className="inline-flex items-center gap-1 rounded-lg bg-green-600 text-white px-3 py-1 font-black text-xs">Join Call <ExternalLink size={12}/></button><span className="text-xs font-bold opacity-75">Status: {m.callStatus || 'ringing'}</span></div></div> : <p>{m.message}</p>}
                    <p className={`text-[10px] mt-1 ${isAdmin ? 'text-slate-300' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
                  </div>;
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
