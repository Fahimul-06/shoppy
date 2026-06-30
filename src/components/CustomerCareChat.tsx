import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Headphones, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { api, getSessionUser, getToken } from '../lib/api';

type CareMessage = {
  id?: string;
  _id?: string;
  senderType: 'customer' | 'admin';
  message: string;
  createdAt?: string;
};

export default function CustomerCareChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement | null>(null);

  const token = getToken('user');
  const user = getSessionUser('user');
  const hidden = useMemo(() => (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/seller') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname.startsWith('/call')
  ), [location.pathname]);

  const loadMessages = async (markRead = false) => {
    if (!token || hidden) return;
    try {
      if (open || markRead) {
        const res = await api.get<{ messages: CareMessage[]; unreadAdminReplies?: number }>('/support/messages', token);
        setMessages(res.messages || []);
        setUnread(res.unreadAdminReplies || 0);
      } else {
        const res = await api.get<{ count: number }>('/support/unread-count', token);
        setUnread(res.count || 0);
      }
    } catch {
      // Keep chat unobtrusive if customer is not logged in or backend is temporarily unavailable.
    }
  };

  useEffect(() => { loadMessages(); }, [token, hidden]);
  useEffect(() => {
    if (!token || hidden) return;
    const timer = window.setInterval(() => loadMessages(), open ? 7000 : 15000);
    return () => window.clearInterval(timer);
  }, [token, hidden, open]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      loadMessages(true).finally(() => setLoading(false));
    }
  }, [open]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages, open]);

  if (hidden) return null;

  const handleOpen = () => {
    if (!token || !user) {
      navigate('/account');
      return;
    }
    setOpen(true);
  };

  const sendMessage = async () => {
    const clean = text.trim();
    if (!clean || !token || sending) return;
    setSending(true);
    setError('');
    setText('');
    try {
      const res = await api.post<{ message: CareMessage }>('/support/messages', { message: clean }, token);
      setMessages((prev) => [...prev, res.message]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message could not be sent');
      setText(clean);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 lg:bottom-6 z-40 rounded-full bg-orange-500 text-white shadow-2xl px-4 py-3 flex items-center gap-2 font-black hover:bg-orange-600"
        aria-label="Open customer care live chat"
      >
        <Headphones size={20} />
        <span className="hidden sm:inline">Customer Care</span>
        {unread > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs min-w-6 h-6 px-1 rounded-full grid place-items-center border-2 border-white">{unread}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 grid place-items-center"><MessageCircle size={20} /></div>
                <div>
                  <h3 className="font-black">Customer Care Live Chat</h3>
                  <p className="text-xs text-slate-300">Ask about orders, returns, payments or products.</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg"><X /></button>
            </div>

            <div ref={boxRef} className="h-80 overflow-y-auto bg-gray-50 p-4 space-y-2">
              {loading ? <div className="h-full grid place-items-center"><Loader2 className="animate-spin text-orange-500" /></div> : messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-16">
                  <p className="font-bold text-gray-700">Hi! How can we help?</p>
                  <p>Send a message and customer care will reply here.</p>
                </div>
              ) : messages.map((m) => (
                <div key={m.id || m._id || `${m.createdAt}-${m.message}`} className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'customer' ? 'ml-auto bg-orange-500 text-white' : 'bg-white border text-gray-800'}`}>
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-1 ${m.senderType === 'customer' ? 'text-orange-100' : 'text-gray-400'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>

            {error && <p className="px-4 pt-2 text-xs text-red-600">{error}</p>}
            <div className="p-3 border-t flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                placeholder="Write your message..."
              />
              <button disabled={sending || !text.trim()} onClick={sendMessage} className="bg-orange-500 disabled:bg-gray-300 text-white rounded-xl px-4 font-bold flex items-center gap-2">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
