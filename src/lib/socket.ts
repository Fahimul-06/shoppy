import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl, getToken } from './api';

export type RealtimeRole = 'admin' | 'delivery';

export function createRealtimeSocket(role: RealtimeRole): Socket {
  return io(getSocketBaseUrl(), {
    auth: { token: getToken(role), role },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });
}

export function socketAck<T = any>(socket: Socket, event: string, payload: unknown, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, response: any) => {
      if (err) return reject(new Error('Realtime request timed out'));
      if (response && response.ok === false) return reject(new Error(response.message || 'Realtime request failed'));
      resolve(response as T);
    });
  });
}
