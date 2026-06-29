import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bike, Loader2, Mic, MicOff, PhoneCall, PhoneOff, ShieldCheck, Volume2 } from 'lucide-react';
import { api, getToken } from '../../lib/api';

type Role = 'delivery' | 'admin';

type Signal = {
  id: string;
  from: Role;
  to: Role;
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  payload: any;
};

const rtcConfig: RTCConfiguration = { iceServers: [] };

function pickRole(requested: string | null): Role {
  if (requested === 'admin' && getToken('admin')) return 'admin';
  if (requested === 'delivery' && getToken('delivery')) return 'delivery';
  if (getToken('admin')) return 'admin';
  return 'delivery';
}

export default function DeliveryCallRoomPage() {
  const { roomId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = pickRole(searchParams.get('role'));
  const token = getToken(role);
  const peerRole: Role = role === 'delivery' ? 'admin' : 'delivery';

  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const seenSignalsRef = useRef<Set<string>>(new Set());
  const makingOfferRef = useRef(false);
  const answerSentRef = useRef(false);
  const mountedRef = useRef(true);

  const [room, setRoom] = useState<any>(null);
  const [status, setStatus] = useState('Preparing call room...');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [ending, setEnding] = useState(false);

  const sendSignal = async (type: Signal['type'], payload: any = {}) => {
    await api.post(`/calls/${roomId}/signals`, { type, payload }, token);
  };

  const createPeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal('candidate', event.candidate.toJSON()).catch(() => {});
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteAudioRef.current && stream) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnected(true);
        setStatus('Connected — internet audio call is live.');
      } else if (state === 'connecting') {
        setStatus('Connecting audio...');
      } else if (state === 'disconnected') {
        setStatus('Connection interrupted. Trying to reconnect...');
      } else if (state === 'failed') {
        setStatus('Connection failed. End this call and start again.');
      } else if (state === 'closed') {
        setStatus('Call ended.');
      }
    };

    return pc;
  };

  const startMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    if (localAudioRef.current) localAudioRef.current.srcObject = stream;
    const pc = createPeer();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  };

  const makeAdminOffer = async () => {
    const pc = createPeer();
    if (role !== 'admin' || makingOfferRef.current || pc.signalingState !== 'stable') return;
    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await sendSignal('offer', pc.localDescription);
      setStatus('Calling delivery man... waiting for answer.');
    } finally {
      makingOfferRef.current = false;
    }
  };

  const handleSignal = async (signal: Signal) => {
    if (seenSignalsRef.current.has(signal.id)) return;
    seenSignalsRef.current.add(signal.id);
    const pc = createPeer();

    if (signal.type === 'offer' && role === 'delivery') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      if (!answerSentRef.current) {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal('answer', pc.localDescription);
        answerSentRef.current = true;
        setStatus('Answer sent. Connecting audio...');
      }
      return;
    }

    if (signal.type === 'answer' && role === 'admin') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      setStatus('Answer received. Connecting audio...');
      return;
    }

    if (signal.type === 'candidate' && signal.payload) {
      try { await pc.addIceCandidate(new RTCIceCandidate(signal.payload)); } catch { /* ignore early/duplicate candidates */ }
      return;
    }

    if (signal.type === 'leave') {
      setStatus(`${peerRole === 'admin' ? 'Customer care' : 'Delivery man'} ended the call.`);
      closeLocalCall(false);
    }
  };

  const pollSignals = async () => {
    if (!mountedRef.current || !token || !roomId) return;
    const seen = Array.from(seenSignalsRef.current).join(',');
    const res = await api.get<{ signals: Signal[]; room: any }>(`/calls/${roomId}/signals?seen=${encodeURIComponent(seen)}`, token);
    setRoom(res.room);
    for (const signal of res.signals || []) await handleSignal(signal);
  };

  const closeLocalCall = (stopTracks = true) => {
    pcRef.current?.close();
    pcRef.current = null;
    if (stopTracks) localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setConnected(false);
  };

  const endCall = async () => {
    if (ending) return;
    setEnding(true);
    try {
      await sendSignal('leave', {});
      await api.patch(`/calls/${roomId}/status`, { status: 'ended' }, token);
    } catch {
      // Call can still close locally.
    } finally {
      closeLocalCall(true);
      setStatus('Call ended.');
      setEnding(false);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      if (!token) {
        navigate(role === 'admin' ? '/admin/login' : '/delivery/login');
        return;
      }
      try {
        setStatus('Joining own call room...');
        const detail = await api.get<{ room: any }>(`/calls/${roomId}`, token);
        setRoom(detail.room);
        await startMedia();
        const joined = await api.post<{ room: any }>(`/calls/${roomId}/join`, {}, token);
        setRoom(joined.room);
        setStatus(role === 'admin' ? 'Starting call to delivery man...' : 'Waiting for customer care to join...');
        if (role === 'admin') await makeAdminOffer();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start internet call');
        setStatus('Call failed.');
      }
    };
    init();
    const timer = window.setInterval(() => pollSignals().catch(() => {}), 1800);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      closeLocalCall(true);
    };
  }, [roomId, role]);

  useEffect(() => {
    if (role !== 'admin') return;
    const timer = window.setInterval(() => {
      if (!connected) makeAdminOffer().catch(() => {});
    }, 6000);
    return () => window.clearInterval(timer);
  }, [connected, role]);

  return (
    <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-200 font-black">Own Internet Call Room</p>
            <h1 className="text-2xl font-black mt-1 flex items-center gap-2"><PhoneCall/> Delivery Support Call</h1>
            <p className="text-sm text-slate-300 mt-1">Room: {roomId}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3"><Bike/></div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-3">
            {error ? <PhoneOff className="text-red-300"/> : connected ? <Volume2 className="text-green-300"/> : <Loader2 className="animate-spin text-blue-300"/>}
            <div>
              <p className="font-black">{error || status}</p>
              <p className="text-xs text-slate-400">You are joined as: {role === 'admin' ? 'Customer Care/Admin' : 'Delivery Man'}</p>
            </div>
          </div>
          {room?.deliveryMan && <p className="text-sm text-slate-300">Delivery: <b>{room.deliveryMan.fullName}</b> • ID: {room.deliveryMan.deliveryCode}</p>}
          <div className="rounded-xl bg-blue-950/60 border border-blue-500/20 p-3 text-xs text-blue-100 flex gap-2"><ShieldCheck size={16}/> This call uses your own app room and backend signaling. No Jitsi or third-party meeting room is used.</div>
        </div>

        <audio ref={localAudioRef} autoPlay muted className="hidden" />
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button onClick={toggleMute} disabled={!localStreamRef.current} className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 ${muted ? 'bg-yellow-500 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}>{muted ? <MicOff/> : <Mic/>}{muted ? 'Unmute' : 'Mute'}</button>
          <button onClick={endCall} disabled={ending} className="rounded-2xl px-6 py-3 font-black flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500"><PhoneOff/>{ending ? 'Ending...' : 'End Call'}</button>
        </div>

        {error && <p className="mt-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
      </div>
    </div>
  );
}
