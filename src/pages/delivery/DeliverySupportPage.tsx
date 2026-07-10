import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Headphones, PhoneCall, Send, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser, getToken } from '../../lib/api';
import { createRealtimeSocket, socketAck } from '../../lib/socket';
import type { Socket } from 'socket.io-client';
import { DELIVERY_LOGIN_PATH, DELIVERY_DASHBOARD_PATH } from '../../lib/adminPortal';

export default function DeliverySupportPage() {
  const navigate = useNavigate();
  const [user] = useState<any>(getSessionUser('delivery'));
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportText, setSupportText] = useState('');
  const [supportError, setSupportError] = useState('');
  const [startingCall, setStartingCall] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pendingCallUrlRef = useRef<string>('');

  const mergeSupportMessages = (incoming: any[]) => {
    setSupportMessages((prev) => {
      const map = new Map<string, any>();
      [...prev, ...incoming].forEach((m) => {
        const id = String(m.id || m._id || `${m.createdAt}-${m.message}`);
        map.set(id, m);
      });
      return Array.from(map.values()).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    });
  };

  const loadSupport = async () => {
    const token = getToken('delivery');
    if (!token) { navigate(DELIVERY_LOGIN_PATH); return; }
    try {
      const res = await api.get<{ messages: any[] }>('/delivery/support', token);
      mergeSupportMessages(res.messages || []);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Support messages load করা যায়নি');
    }
  };

  useEffect(() => { loadSupport(); }, []);

  useEffect(() => {
    const token = getToken('delivery');
    if (!token) return;
    const socket = createRealtimeSocket('delivery');
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('delivery-support:join', {}));
    socket.on('delivery-support:message', (message: any) => {
      mergeSupportMessages([message]);
      if (message?.messageType === 'call' && message?.callUrl) pendingCallUrlRef.current = `${message.callUrl}?role=delivery`;
    });
    socket.on('delivery-support:call-answered', (payload: any) => {
      const callUrl = payload?.callUrl || pendingCallUrlRef.current;
      if (callUrl) navigate(`${callUrl}?role=delivery`.replace('?role=delivery?role=delivery', '?role=delivery'), { replace: false });
    });
    socket.on('connect_error', () => setSupportError('Realtime connection failed. Fallback refresh is still active.'));
    const timer = window.setInterval(() => loadSupport(), 30000);
    return () => { window.clearInterval(timer); socket.disconnect(); socketRef.current = null; };
  }, []);

  const startVirtualCall = async () => {
    if (startingCall) return;
    setStartingCall(true);
    setSupportError('');
    try {
      const res = await api.post<{ message: any; callUrl: string; roomName?: string }>('/delivery/support/call', {}, getToken('delivery'));
      mergeSupportMessages([res.message]);
      if (res.callUrl) {
        pendingCallUrlRef.current = `${res.callUrl}?role=delivery`;
        navigate(`${res.callUrl}?role=delivery`, { replace: false });
      }
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'ইন্টারনেট কল শুরু করা যায়নি');
    } finally {
      setStartingCall(false);
    }
  };

  const sendSupport = async () => {
    const clean = supportText.trim();
    if (!clean) return;
    setSupportText('');
    setSupportError('');
    try {
      if (socketRef.current?.connected) {
        const res = await socketAck<{ message: any }>(socketRef.current, 'delivery-support:message', { message: clean, language: 'bn' });
        mergeSupportMessages([res.message]);
      } else {
        const res = await api.post<{ message: any }>('/delivery/support', { message: clean, language: 'bn' }, getToken('delivery'));
        mergeSupportMessages([res.message]);
      }
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'মেসেজ পাঠানো যায়নি');
      setSupportText(clean);
    }
  };

  return <div className="min-h-screen bg-gray-100">
    <header className="bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate(DELIVERY_DASHBOARD_PATH)} className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 mb-1"><ArrowLeft size={14}/> Back to dashboard</button>
          <h1 className="text-xl font-black flex items-center gap-2"><Headphones size={22}/> Customer Care Support</h1>
          <p className="text-xs text-slate-300">{user?.fullName} • ID: {user?.deliveryCode || '------'}</p>
        </div>
        <button onClick={startVirtualCall} disabled={startingCall} className="bg-green-600 disabled:bg-gray-500 text-white rounded-xl px-4 py-2 font-black flex items-center justify-center gap-2 text-sm"><PhoneCall size={16}/>{startingCall ? 'Starting...' : 'Internet Call'}</button>
      </div>
    </header>

    <main className="max-w-4xl mx-auto px-4 py-6">
      <section className="bg-white border rounded-2xl overflow-hidden min-h-[70vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-black">Delivery Support বাংলা</h2>
          <p className="text-xs text-gray-500">বাংলায় customer care-এ মেসেজ পাঠান অথবা internet call করুন।</p>
        </div>
        <div className="flex-1 min-h-[420px] overflow-y-auto p-4 bg-gray-50 space-y-2">
          {supportMessages.length === 0 ? <p className="text-center text-gray-500 mt-20 text-sm">No support messages yet. বাংলায় মেসেজ লিখুন।</p> : supportMessages.map((m) => {
            const isCall = m.messageType === 'call';
            return <div key={m.id || m._id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'delivery' ? 'ml-auto bg-blue-600 text-white' : 'bg-white border text-gray-800'}`}>
              {isCall ? <div className="space-y-2"><p className="font-black flex items-center gap-2"><Video size={15}/> Internet call request</p><p>{m.message}</p>{m.callUrl && <a href={`${m.callUrl}?role=delivery`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white text-blue-700 px-3 py-1 font-black text-xs">Open call <ExternalLink size={12}/></a>}<p className="text-xs opacity-80">Status: {m.callStatus || 'ringing'}</p></div> : <p>{m.message}</p>}
              <p className={`text-[10px] mt-1 ${m.senderType === 'delivery' ? 'text-blue-100' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
            </div>;
          })}
        </div>
        {supportError && <p className="px-4 pt-2 text-xs text-red-600 font-bold">{supportError}</p>}
        <div className="p-3 border-t flex gap-2">
          <input value={supportText} onChange={(e) => setSupportText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendSupport(); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="বাংলায় লিখুন... / Write message..."/>
          <button onClick={sendSupport} disabled={!supportText.trim()} className="bg-blue-600 disabled:bg-gray-300 text-white rounded-xl px-4 font-black flex items-center gap-2"><Send size={16}/> Send</button>
        </div>
      </section>
    </main>
  </div>;
}
