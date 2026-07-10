import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bike, Loader2, Mic, MicOff, PhoneCall, PhoneOff, ShieldCheck, Volume2, Wifi } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { createRealtimeSocket, socketAck } from '../../lib/socket';
import type { Socket } from 'socket.io-client';
import { ADMIN_LOGIN_PATH, ADMIN_PORTAL_PATH, DELIVERY_LOGIN_PATH, DELIVERY_SUPPORT_PATH } from '../../lib/adminPortal';

type Role = 'delivery' | 'admin';

type Signal = {
  id?: string;
  from: Role;
  to?: Role;
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  payload: any;
};

function envFlag(name: string, defaultValue: boolean) {
  const raw = String(import.meta.env[name] ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  return !['0', 'false', 'no', 'off', 'disabled'].includes(raw);
}

function envList(name: string, fallback = '') {
  return String(import.meta.env[name] || fallback)
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

function buildIceServers(): RTCIceServer[] {
  const stunEnabled = envFlag('VITE_CALL_STUN_ENABLED', true);
  const turnEnabled = envFlag('VITE_CALL_TURN_ENABLED', true);
  const stunUrls = stunEnabled
    ? envList('VITE_STUN_URLS', 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
    : [];
  const turnUrls = turnEnabled
    ? envList('VITE_TURN_URLS', String(import.meta.env.VITE_TURN_URL || ''))
    : [];
  const username = String(import.meta.env.VITE_TURN_USERNAME || '').trim();
  const credential = String(import.meta.env.VITE_TURN_CREDENTIAL || '').trim();

  const iceServers: RTCIceServer[] = [];
  if (stunUrls.length) iceServers.push({ urls: stunUrls });
  if (turnUrls.length) iceServers.push(username || credential ? { urls: turnUrls, username, credential } : { urls: turnUrls });
  return iceServers;
}

function hasConfiguredIceServers() {
  return buildIceServers().length > 0;
}

function shouldUseDirectWebRtc() {
  if (envFlag('VITE_CALL_FORCE_OWN_RELAY', false)) return false;
  if (!hasConfiguredIceServers() && envFlag('VITE_CALL_RELAY_IF_NO_ICE', true)) return false;
  return true;
}

function buildRtcConfig(): RTCConfiguration {
  const iceServers = buildIceServers();
  const configuredPolicy = String(import.meta.env.VITE_CALL_ICE_TRANSPORT_POLICY || 'all').trim();
  const iceTransportPolicy = configuredPolicy === 'relay' ? 'relay' : 'all';
  return { iceServers, iceTransportPolicy, bundlePolicy: 'balanced' };
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

function getAudioContextConstructor() {
  return window.AudioContext || (window as any).webkitAudioContext;
}

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer as ArrayBuffer;
}

function downsampleFloat32(input: Float32Array, inputRate: number, outputRate = 16000) {
  if (!inputRate || inputRate <= outputRate) return input;
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  let inputOffset = 0;
  for (let i = 0; i < outputLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = inputOffset; j < nextOffset && j < input.length; j += 1) {
      sum += input[j];
      count += 1;
    }
    output[i] = count ? sum / count : 0;
    inputOffset = nextOffset;
  }
  return output;
}

function normalizeBinaryPayload(input: any): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  if (input?.type === 'Buffer' && Array.isArray(input.data)) {
    return new Uint8Array(input.data).buffer as ArrayBuffer;
  }
  if (Array.isArray(input)) return new Uint8Array(input).buffer as ArrayBuffer;
  throw new Error('Unsupported relay audio payload');
}

function pcm16ToFloat(input: ArrayBuffer) {
  const pcm = new Int16Array(input);
  const output = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) output[i] = pcm[i] / 0x8000;
  return output;
}

async function ensureAudioContext(existing?: AudioContext | null) {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) throw new Error('This browser does not support live audio relay.');
  const ctx = existing && existing.state !== 'closed' ? existing : new AudioContextCtor();
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
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
  const mutedRef = useRef(false);
  const relayAudioContextRef = useRef<AudioContext | null>(null);
  const relayInputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const relayProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const relaySilentGainRef = useRef<GainNode | null>(null);
  const relayNextPlayTimeRef = useRef(0);
  const relaySentCountRef = useRef(0);
  const relayReceivedCountRef = useRef(0);
  const relayMonitorRef = useRef<number | null>(null);
  const directWebRtcEnabledRef = useRef(shouldUseDirectWebRtc());

  const [room, setRoom] = useState<any>(null);
  const [status, setStatus] = useState('Preparing live call room...');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [ending, setEnding] = useState(false);
  const [relayMode, setRelayMode] = useState(false);
  const [relaySentCount, setRelaySentCount] = useState(0);
  const [relayReceivedCount, setRelayReceivedCount] = useState(0);
  const [peerRelayReady, setPeerRelayReady] = useState(false);

  const callHome = () => role === 'admin' ? ADMIN_PORTAL_PATH : DELIVERY_SUPPORT_PATH;

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

  const stopRelayCapture = () => {
    try { recorderRef.current?.stop(); } catch { /* recorder may already be stopped */ }
    recorderRef.current = null;
    try { relayProcessorRef.current?.disconnect(); } catch { /* ignore */ }
    try { relayInputSourceRef.current?.disconnect(); } catch { /* ignore */ }
    try { relaySilentGainRef.current?.disconnect(); } catch { /* ignore */ }
    relayProcessorRef.current = null;
    relayInputSourceRef.current = null;
    relaySilentGainRef.current = null;
  };

  const playRelayPcmChunk = async (chunk: ArrayBuffer, sampleRate = 48000) => {
    if (hasEndedRef.current) return;
    try {
      const ctx = await ensureAudioContext(relayAudioContextRef.current);
      relayAudioContextRef.current = ctx;
      const floatData = pcm16ToFloat(chunk);
      const audioBuffer = ctx.createBuffer(1, floatData.length, sampleRate || ctx.sampleRate);
      audioBuffer.copyToChannel(floatData, 0);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      const maxBufferedAhead = 0.16;
      const minLead = 0.018;
      if (!relayNextPlayTimeRef.current || relayNextPlayTimeRef.current > ctx.currentTime + maxBufferedAhead) {
        relayNextPlayTimeRef.current = ctx.currentTime + minLead;
      }
      const startAt = Math.max(ctx.currentTime + minLead, relayNextPlayTimeRef.current);
      source.start(startAt);
      relayNextPlayTimeRef.current = startAt + audioBuffer.duration;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not play relay audio');
    }
  };

  const playRelayBlobChunk = (chunk: ArrayBuffer, mimeType = 'audio/webm') => {
    const blob = new Blob([chunk], { type: mimeType || 'audio/webm' });
    const url = URL.createObjectURL(blob);
    relayQueueRef.current.push({ blob, url });
    playNextRelayChunk();
  };

  const startOwnServerRelay = async (reason = 'network fallback') => {
    if (relayModeRef.current || hasEndedRef.current) return;
    const socket = socketRef.current;
    const stream = localStreamRef.current;
    if (!socket?.connected || !stream) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      setError('Microphone track missing. Please rejoin the call.');
      return;
    }

    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) {
      setError('This browser does not support own-server audio relay. Try Chrome/Edge mobile or desktop.');
      return;
    }

    relayModeRef.current = true;
    setRelayMode(true);
    setConnected(true);
    setError('');
    setStatus(`Own-server relay mode activated (${reason}). Starting microphone relay...`);

    try {
      await socketAck(socket, 'call:relay-mode', { roomId, enabled: true, reason }, 2500).catch(() => {});
      stopRelayCapture();
      const ctx = await ensureAudioContext(relayAudioContextRef.current);
      relayAudioContextRef.current = ctx;
      relayNextPlayTimeRef.current = Math.max(ctx.currentTime + 0.035, relayNextPlayTimeRef.current || 0);

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(1024, 1, 1);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      relayInputSourceRef.current = source;
      relayProcessorRef.current = processor;
      relaySilentGainRef.current = silentGain;
      await socketAck(socket, 'call:relay-ready', { roomId }, 2500).catch(() => {});
      setStatus(`Low-latency own-server relay active. Waiting for live audio from ${peerRole === 'admin' ? 'customer care' : 'delivery man'}...`);
      if (relayMonitorRef.current) window.clearInterval(relayMonitorRef.current);
      relayMonitorRef.current = window.setInterval(() => {
        if (hasEndedRef.current || !relayModeRef.current) return;
        const sent = relaySentCountRef.current;
        const received = relayReceivedCountRef.current;
        setRelaySentCount(sent);
        setRelayReceivedCount(received);
        if (received > 0) {
          setConnected(true);
          setStatus(`Live audio connected using own-server relay. Sent ${sent} audio packets, received ${received}.`);
        } else if (sent > 0) {
          setStatus(`Own-server relay is sending audio (${sent} packets). Waiting for the other side audio...`);
        }
      }, 1200);

      processor.onaudioprocess = (event) => {
        if (hasEndedRef.current || !socket.connected || mutedRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        const targetSampleRate = 16000;
        const downsampled = downsampleFloat32(input, ctx.sampleRate, targetSampleRate);
        const pcmBuffer = floatToPcm16(downsampled);
        relaySentCountRef.current += 1;
        const payload = {
          roomId,
          format: 'pcm16-low-latency',
          sampleRate: targetSampleRate,
          channels: 1,
          chunk: pcmBuffer,
          sentAt: Date.now(),
        };
        if ((socket as any).volatile?.emit) {
          (socket as any).volatile.emit('call:relay-audio', payload);
        } else {
          socket.emit('call:relay-audio', payload);
        }
      };
    } catch (e) {
      relayModeRef.current = false;
      setRelayMode(false);
      setError(e instanceof Error ? e.message : 'Could not start own-server audio relay');
    }
  };

  const closeLocalCall = (stopTracks = true) => {
    if (offerTimerRef.current) window.clearTimeout(offerTimerRef.current);
    if (relayFallbackTimerRef.current) window.clearTimeout(relayFallbackTimerRef.current);
    if (relayMonitorRef.current) window.clearInterval(relayMonitorRef.current);
    offerTimerRef.current = null;
    relayFallbackTimerRef.current = null;
    stopRelayCapture();
    try { relayAudioContextRef.current?.close(); } catch { /* ignore */ }
    relayAudioContextRef.current = null;
    relayNextPlayTimeRef.current = 0;
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
    if (!directWebRtcEnabledRef.current) {
      throw new Error('Direct WebRTC is disabled. Using own-server relay mode.');
    }
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
    if (directWebRtcEnabledRef.current) {
      const pc = createPeer();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }
  };

  const makeAdminOffer = async (iceRestart = false) => {
    if (!directWebRtcEnabledRef.current) {
      await startOwnServerRelay('STUN/TURN disabled or forced relay');
      return;
    }
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
    if (!directWebRtcEnabledRef.current) {
      await startOwnServerRelay('STUN/TURN disabled or forced relay');
      return;
    }
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
    if (hasEndedRef.current) return;
    const currentRoom = nextRoom || room;
    if (!currentRoom?.deliveryJoinedAt || !currentRoom?.adminJoinedAt) {
      setStatus('Waiting for both sides to enter the call page...');
      return;
    }

    if (!directWebRtcEnabledRef.current) {
      setStatus('STUN/TURN is disabled or unavailable. Starting own-server relay mode automatically...');
      window.setTimeout(() => startOwnServerRelay('STUN/TURN disabled or unavailable').catch(() => {}), 350);
      return;
    }

    if (role !== 'admin') return;
    if (offerTimerRef.current) window.clearTimeout(offerTimerRef.current);
    offerTimerRef.current = window.setTimeout(() => makeAdminOffer().catch((e) => setError(e instanceof Error ? e.message : 'Could not start live call')), 400);
    if (relayFallbackTimerRef.current) window.clearTimeout(relayFallbackTimerRef.current);
    relayFallbackTimerRef.current = window.setTimeout(() => {
      if (!connected && !hasEndedRef.current) startOwnServerRelay('STUN/TURN direct connection timeout');
    }, 8000);
  };

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      if (!token) {
        navigate(role === 'admin' ? ADMIN_LOGIN_PATH : DELIVERY_LOGIN_PATH);
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
            if (payload.room?.relayEnabled) {
              window.setTimeout(() => startOwnServerRelay('room relay active').catch(() => {}), 350);
            } else if (!directWebRtcEnabledRef.current && payload.room?.deliveryJoinedAt && payload.room?.adminJoinedAt) {
              window.setTimeout(() => startOwnServerRelay('STUN/TURN disabled or unavailable').catch(() => {}), 350);
            }
          }
        });
        socket.on('call:relay-mode', (payload: any) => {
          if (payload?.room) setRoom(payload.room);
          if (payload?.enabled !== false) startOwnServerRelay(payload?.reason || 'peer switched to relay').catch(() => {});
        });
        socket.on('call:relay-ready', (payload: any) => {
          if (payload?.room) setRoom(payload.room);
          if (payload?.role && payload.role !== role) setPeerRelayReady(true);
        });
        socket.on('call:relay-audio', ({ from, chunk, mimeType, format, sampleRate }: { from: Role; chunk: any; mimeType?: string; format?: string; sampleRate?: number }) => {
          if (from === role || hasEndedRef.current || !chunk) return;
          try {
            const binary = normalizeBinaryPayload(chunk);
            relayReceivedCountRef.current += 1;
            setRelayReceivedCount(relayReceivedCountRef.current);
            setConnected(true);
            if (String(format || '').startsWith('pcm16')) {
              playRelayPcmChunk(binary, sampleRate || 48000);
              return;
            }
            playRelayBlobChunk(binary, mimeType || 'audio/webm');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not receive relay audio');
          }
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
          if (joined.room?.relayEnabled) {
            window.setTimeout(() => startOwnServerRelay('room already in relay mode').catch(() => {}), 350);
          } else if (!directWebRtcEnabledRef.current && joined.room?.deliveryJoinedAt && joined.room?.adminJoinedAt) {
            window.setTimeout(() => startOwnServerRelay('STUN/TURN disabled or unavailable').catch(() => {}), 350);
          }
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
            <p className="text-xs uppercase tracking-[0.25em] text-blue-200 font-black">Realtime STUN/TURN Internet Call Room</p>
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
              {relayMode && <p className="text-xs text-emerald-200 mt-1">Relay packets — sent: {relaySentCount} • received: {relayReceivedCount} {peerRelayReady ? '• peer ready' : '• waiting peer relay'}</p>}
              {!relayMode && <p className="text-xs text-blue-200 mt-1">Direct mode: {directWebRtcEnabledRef.current ? 'STUN/TURN WebRTC enabled' : 'STUN/TURN disabled → own relay auto mode'}</p>}
            </div>
          </div>
          {room?.deliveryMan && <p className="text-sm text-slate-300">Delivery: <b>{room.deliveryMan.fullName}</b> • ID: {room.deliveryMan.deliveryCode}</p>}
          <div className="rounded-xl bg-blue-950/60 border border-blue-500/20 p-3 text-xs text-blue-100 flex gap-2"><ShieldCheck size={16}/> No Jitsi and no third-party meeting room. The app tries WebRTC with configured STUN/TURN first. If STUN/TURN is disabled, missing, blocked, or times out, it automatically switches to your own backend Socket.IO audio relay.</div>
        </div>

        <audio ref={localAudioRef} autoPlay muted className="hidden" />
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button onClick={toggleMute} disabled={!localStreamRef.current} className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 ${muted ? 'bg-yellow-500 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}>{muted ? <MicOff/> : <Mic/>}{muted ? 'Unmute' : 'Mute'}</button>
          <button onClick={() => startOwnServerRelay('manual switch')} disabled={relayMode || !localStreamRef.current} className="rounded-2xl px-5 py-3 font-black flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-500"><Wifi/>Own Relay</button>
          <button onClick={() => stopRoomAndExit('ended')} disabled={ending} className="rounded-2xl px-6 py-3 font-black flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500"><PhoneOff/>{ending ? 'Ending...' : 'End Call'}</button>
        </div>

        {relayMode && <p className="mt-4 text-sm text-emerald-100 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">Own-server relay mode is active. This is the automatic fallback when STUN/TURN is disabled, missing, blocked, or direct WebRTC cannot connect.</p>}
        {error && <p className="mt-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
      </div>
    </div>
  );
}
