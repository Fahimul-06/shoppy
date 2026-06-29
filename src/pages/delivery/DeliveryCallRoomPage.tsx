import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bike, Loader2, Mic, MicOff, PhoneCall, PhoneOff, ShieldCheck, Volume2, Wifi } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { createRealtimeSocket, socketAck } from '../../lib/socket';
import type { Socket } from 'socket.io-client';

type Role = 'delivery' | 'admin';

type Signal = {
  id?: string;
  from: Role;
  to?: Role;
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  payload: any;
};

function buildRtcConfig(): RTCConfiguration {
  const urls = String(import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL || '').split(',').map((url) => url.trim()).filter(Boolean);
  const username = String(import.meta.env.VITE_TURN_USERNAME || '').trim();
  const credential = String(import.meta.env.VITE_TURN_CREDENTIAL || '').trim();
  const iceServers: RTCIceServer[] = [];
  if (urls.length) iceServers.push(username || credential ? { urls, username, credential } : { urls });
  return { iceServers, iceTransportPolicy: 'all', bundlePolicy: 'balanced' };
}

function pickRole(requested: string | null): Role {
  if (requested === 'admin' && getToken('admin')) return 'admin';
  if (requested === 'delivery' && getToken('delivery')) return 'delivery';
  if (getToken('admin')) return 'admin';
  return 'delivery';
}

function pickRecorderMimeType() {
  const choices = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];
  return choices.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
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
  const socketRef = useRef<Socket | null>(null);
  const makingOfferRef = useRef(false);
  const hasEndedRef = useRef(false);
  const mountedRef = useRef(true);
  const remoteDescriptionReadyRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerTimerRef = useRef<number | null>(null);
  const relayFallbackTimerRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const relayQueueRef = useRef<{ blob: Blob; url: string }[]>([]);
  const relayPlayingRef = useRef(false);
  const relayModeRef = useRef(false);

  const [room, setRoom] = useState<any>(null);
  const [status, setStatus] = useState('Preparing live call room...');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [ending, setEnding] = useState(false);
  const [relayMode, setRelayMode] = useState(false);

  const callHome = () => role === 'admin' ? '/admin' : '/delivery/support';

  const sendSignal = async (type: Signal['type'], payload: any = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Realtime call connection is not ready');
    await socketAck(socket, 'call:signal', { roomId, type, payload });
  };

  const playNextRelayChunk = () => {
    if (relayPlayingRef.current || hasEndedRef.current) return;
    const next = relayQueueRef.current.shift();
    if (!next) return;
    relayPlayingRef.current = true;
    const audio = new Audio(next.url);
    audio.onended = () => {
      URL.revokeObjectURL(next.url);
      relayPlayingRef.current = false;
      playNextRelayChunk();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(next.url);
      relayPlayingRef.current = false;
      playNextRelayChunk();
    };
    audio.play().catch(() => {
      URL.revokeObjectURL(next.url);
      relayPlayingRef.current = false;
      playNextRelayChunk();
    });
  };

  const startOwnServerRelay = async (reason = 'network fallback') => {
    if (relayModeRef.current || hasEndedRef.current) return;
    const socket = socketRef.current;
    const stream = localStreamRef.current;
    if (!socket?.connected || !stream) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support own-server audio relay. Try Chrome/Edge mobile or desktop.');
      return;
    }

    relayModeRef.current = true;
    setRelayMode(true);
    setConnected(true);
    setError('');
    setStatus(`Connected using own-server relay mode (${reason}). Works through strict NAT/mobile networks because audio passes through your backend.`);

    try {
      await socketAck(socket, 'call:relay-mode', { roomId, enabled: true }, 2500).catch(() => {});
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = async (event) => {
        if (!event.data?.size || hasEndedRef.current || !socket.connected || muted) return;
        const chunk = await event.data.arrayBuffer();
        socket.emit('call:relay-audio', { roomId, chunk, mimeType: event.data.type || mimeType || 'audio/webm' });
      };
      recorder.onerror = () => setError('Audio relay recorder failed. Please rejoin the call.');
      recorder.start(700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start own-server audio relay');
    }
  };

  const closeLocalCall = (stopTracks = true) => {
    if (offerTimerRef.current) window.clearTimeout(offerTimerRef.current);
    if (relayFallbackTimerRef.current) window.clearTimeout(relayFallbackTimerRef.current);
    offerTimerRef.current = null;
    relayFallbackTimerRef.current = null;
    try { recorderRef.current?.stop(); } catch { /* recorder may already be stopped */ }
    recorderRef.current = null;
    relayModeRef.current = false;
    relayQueueRef.current.splice(0).forEach((item) => URL.revokeObjectURL(item.url));
    relayPlayingRef.current = false;
    pcRef.current?.close();
    pcRef.current = null;
    if (stopTracks) localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteDescriptionReadyRef.current = false;
    pendingCandidatesRef.current = [];
    if (localAudioRef.current) localAudioRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setConnected(false);
    setRelayMode(false);
  };

  const leavePageAfterEnd = () => {
    window.setTimeout(() => navigate(callHome(), { replace: true }), 350);
  };

  const stopRoomAndExit = async (reason = 'ended') => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setEnding(true);
    try {
      if (socketRef.current?.connected) {
        await socketAck(socketRef.current, 'call:end', { roomId, reason }, 2500).catch(() => {});
      } else {
        await api.patch(`/calls/${roomId}/status`, { status: 'ended' }, token).catch(() => {});
      }
    } finally {
      closeLocalCall(true);
      socketRef.current?.disconnect();
      setStatus('Call ended. Leaving call room...');
      setEnding(false);
      leavePageAfterEnd();
    }
  };

  const flushPendingCandidates = async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescriptionReadyRef.current) return;
    const pending = pendingCandidatesRef.current.splice(0);
    for (const candidate of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore duplicate/early candidates */ }
    }
  };

  const createPeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(buildRtcConfig());
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && !hasEndedRef.current) sendSignal('candidate', event.candidate.toJSON()).catch(() => {});
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
        if (relayFallbackTimerRef.current) window.clearTimeout(relayFallbackTimerRef.current);
        setError('');
        setConnected(true);
        setRelayMode(false);
        setStatus('Connected — direct WebRTC audio call is running.');
      } else if (state === 'connecting') {
        setStatus('Connecting live audio...');
      } else if (state === 'disconnected') {
        setStatus('Connection interrupted. Switching to own-server relay if direct audio does not return...');
        window.setTimeout(() => {
          if (!hasEndedRef.current && pcRef.current?.connectionState !== 'connected') startOwnServerRelay('direct WebRTC disconnected');
        }, 2500);
      } else if (state === 'failed') {
        setStatus('Direct WebRTC failed. Switching to own-server relay mode...');
        startOwnServerRelay('strict NAT/mobile network').catch(() => {});
      } else if (state === 'closed') {
        setStatus('Call stopped.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' && !hasEndedRef.current) {
        startOwnServerRelay('ICE failed').catch(() => {});
      }
    };

    return pc;
  };

  const startMedia = async () => {
    if (localStreamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    if (localAudioRef.current) localAudioRef.current.srcObject = stream;
    const pc = createPeer();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  };

  const makeAdminOffer = async (iceRestart = false) => {
    const pc = createPeer();
    if (role !== 'admin' || makingOfferRef.current || hasEndedRef.current) return;
    if (pc.signalingState !== 'stable') return;
    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, iceRestart });
      await pc.setLocalDescription(offer);
      await sendSignal('offer', pc.localDescription);
      setStatus(iceRestart ? 'Restarting direct connection...' : 'Calling delivery man live... waiting for answer.');
    } finally {
      makingOfferRef.current = false;
    }
  };

  const handleSignal = async (signal: Signal) => {
    if (hasEndedRef.current || signal.from === role) return;
    const pc = createPeer();

    if (signal.type === 'offer' && role === 'delivery') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      remoteDescriptionReadyRef.current = true;
      await flushPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal('answer', pc.localDescription);
      setStatus('Answered. Connecting live audio...');
      return;
    }

    if (signal.type === 'answer' && role === 'admin') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      remoteDescriptionReadyRef.current = true;
      await flushPendingCandidates();
      setStatus('Answer received. Connecting live audio...');
      return;
    }

    if (signal.type === 'candidate' && signal.payload) {
      if (!remoteDescriptionReadyRef.current || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(signal.payload);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.payload)); } catch { /* ignore duplicate/early candidates */ }
      }
      return;
    }

    if (signal.type === 'leave') {
      setStatus(`${peerRole === 'admin' ? 'Customer care' : 'Delivery man'} ended the call.`);
      await stopRoomAndExit('peer-left');
    }
  };

  const maybeStartOffer = (nextRoom?: any) => {
    if (role !== 'admin' || hasEndedRef.current) return;
    const currentRoom = nextRoom || room;
    if (!currentRoom?.deliveryJoinedAt || !currentRoom?.adminJoinedAt) {
      setStatus('Waiting for both sides to enter the call page...');
      return;
    }
    if (offerTimerRef.current) window.clearTimeout(offerTimerRef.current);
    offerTimerRef.current = window.setTimeout(() => makeAdminOffer().catch((e) => setError(e instanceof Error ? e.message : 'Could not start live call')), 400);
    if (relayFallbackTimerRef.current) window.clearTimeout(relayFallbackTimerRef.current);
    relayFallbackTimerRef.current = window.setTimeout(() => {
      if (!connected && !hasEndedRef.current) startOwnServerRelay('direct connection timeout');
    }, 9000);
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
        setStatus('Joining realtime call room...');
        const detail = await api.get<{ room: any }>(`/calls/${roomId}`, token);
        setRoom(detail.room);
        await startMedia();

        const socket = createRealtimeSocket(role);
        socketRef.current = socket;
        socket.on('call:signal', (signal: Signal) => handleSignal(signal).catch((e) => setError(e instanceof Error ? e.message : 'Signal failed')));
        socket.on('call:room', (payload: any) => {
          if (payload?.room) {
            setRoom(payload.room);
            maybeStartOffer(payload.room);
          }
        });
        socket.on('call:relay-mode', () => startOwnServerRelay('peer switched to relay').catch(() => {}));
        socket.on('call:relay-audio', ({ from, chunk, mimeType }: { from: Role; chunk: ArrayBuffer; mimeType: string }) => {
          if (from === role || hasEndedRef.current) return;
          const blob = new Blob([chunk], { type: mimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          relayQueueRef.current.push({ blob, url });
          playNextRelayChunk();
        });
        socket.on('call:ended', () => {
          if (!hasEndedRef.current) {
            hasEndedRef.current = true;
            closeLocalCall(true);
            setStatus('Call ended. Leaving call room...');
            leavePageAfterEnd();
          }
        });
        socket.on('connect', async () => {
          const joined = await socketAck<{ room: any; role: Role }>(socket, 'call:join', { roomId }).catch((e) => { throw e; });
          if (mountedRef.current) setRoom(joined.room);
          setStatus(role === 'admin' ? 'Waiting for delivery man answer...' : 'Waiting for customer care to answer...');
          maybeStartOffer(joined.room);
        });
        socket.on('connect_error', (e) => setError(e.message || 'Realtime call connection failed'));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start internet call');
        setStatus('Call failed.');
      }
    };
    init();

    const onBeforeUnload = () => {
      if (!hasEndedRef.current) socketRef.current?.emit('call:end', { roomId, reason: 'left-page' });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (!hasEndedRef.current) socketRef.current?.emit('call:end', { roomId, reason: 'left-page' });
      closeLocalCall(true);
      socketRef.current?.disconnect();
    };
  }, [roomId, role]);

  useEffect(() => {
    if (role !== 'admin') return;
    const timer = window.setInterval(() => {
      if (!connected && socketRef.current?.connected && !hasEndedRef.current) maybeStartOffer();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [connected, role, room]);

  return (
    <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-200 font-black">Realtime Own Internet Call Room</p>
            <h1 className="text-2xl font-black mt-1 flex items-center gap-2"><PhoneCall/> Delivery Support Call</h1>
            <p className="text-sm text-slate-300 mt-1">Room: {roomId}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3"><Bike/></div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-3">
            {error ? <PhoneOff className="text-red-300"/> : relayMode ? <Wifi className="text-emerald-300"/> : connected ? <Volume2 className="text-green-300"/> : <Loader2 className="animate-spin text-blue-300"/>}
            <div>
              <p className="font-black">{error || status}</p>
              <p className="text-xs text-slate-400">You are joined as: {role === 'admin' ? 'Customer Care/Admin' : 'Delivery Man'}</p>
            </div>
          </div>
          {room?.deliveryMan && <p className="text-sm text-slate-300">Delivery: <b>{room.deliveryMan.fullName}</b> • ID: {room.deliveryMan.deliveryCode}</p>}
          <div className="rounded-xl bg-blue-950/60 border border-blue-500/20 p-3 text-xs text-blue-100 flex gap-2"><ShieldCheck size={16}/> No Jitsi and no third-party meeting room. The app tries direct WebRTC first; if strict NAT/mobile networks block it, the call automatically switches to your own backend Socket.IO audio relay.</div>
        </div>

        <audio ref={localAudioRef} autoPlay muted className="hidden" />
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button onClick={toggleMute} disabled={!localStreamRef.current} className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 ${muted ? 'bg-yellow-500 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}>{muted ? <MicOff/> : <Mic/>}{muted ? 'Unmute' : 'Mute'}</button>
          <button onClick={() => startOwnServerRelay('manual switch')} disabled={relayMode || !localStreamRef.current} className="rounded-2xl px-5 py-3 font-black flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-500"><Wifi/>Own Relay</button>
          <button onClick={() => stopRoomAndExit('ended')} disabled={ending} className="rounded-2xl px-6 py-3 font-black flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500"><PhoneOff/>{ending ? 'Ending...' : 'End Call'}</button>
        </div>

        {relayMode && <p className="mt-4 text-sm text-emerald-100 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">Own-server relay mode is active. This works on strict NAT/mobile networks because audio travels through your backend WebSocket connection instead of requiring direct peer-to-peer NAT traversal.</p>}
        {error && <p className="mt-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
      </div>
    </div>
  );
}
