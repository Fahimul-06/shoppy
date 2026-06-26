const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

type ApiOptions = RequestInit & { token?: string | null };

export function getToken(role: 'user' | 'seller' | 'admin' = 'user') {
  return localStorage.getItem(`${role}Token`);
}

export function setSession(role: 'user' | 'seller' | 'admin', token: string, user: unknown) {
  localStorage.setItem(`${role}Token`, token);
  localStorage.setItem(`${role}User`, JSON.stringify(user));
}

export function clearSession(role: 'user' | 'seller' | 'admin') {
  localStorage.removeItem(`${role}Token`);
  localStorage.removeItem(`${role}User`);
}

export function getSessionUser<T = any>(role: 'user' | 'seller' | 'admin' = 'user'): T | null {
  const raw = localStorage.getItem(`${role}User`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(payload?.message || payload?.error || 'Request failed');
  return payload as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => apiFetch<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), token }),
  put: <T>(path: string, body?: unknown, token?: string | null) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}), token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}), token }),
  delete: <T>(path: string, token?: string | null) => apiFetch<T>(path, { method: 'DELETE', token }),
  upload: <T>(path: string, formData: FormData, token?: string | null) => apiFetch<T>(path, { method: 'POST', body: formData, token }),
};
