import { getToken } from '../../lib/api';
import type { Role } from './callTypes';

export function buildRtcConfig(): RTCConfiguration {
  const urls = String(import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  const username = String(import.meta.env.VITE_TURN_USERNAME || '').trim();
  const credential = String(import.meta.env.VITE_TURN_CREDENTIAL || '').trim();
  const iceServers: RTCIceServer[] = [];
  if (urls.length) iceServers.push(username || credential ? { urls, username, credential } : { urls });
  return { iceServers, iceTransportPolicy: 'all', bundlePolicy: 'balanced' };
}

export function pickRole(requested: string | null): Role {
  if (requested === 'admin' && getToken('admin')) return 'admin';
  if (requested === 'delivery' && getToken('delivery')) return 'delivery';
  if (getToken('admin')) return 'admin';
  return 'delivery';
}
