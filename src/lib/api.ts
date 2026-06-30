const configuredApiUrl = import.meta.env.VITE_API_URL;

function defaultApiBaseUrl() {
  if (configuredApiUrl) return configuredApiUrl;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'shoppy1.onrender.com') return 'https://shoppy-o30r.onrender.com/api';
  }
  return '/api';
}

export const API_BASE_URL = defaultApiBaseUrl().replace(/\/$/, '');

type ApiOptions = RequestInit & { token?: string | null; timeoutMs?: number };

export function getToken(role: 'user' | 'seller' | 'admin' | 'delivery' = 'user') {
  return localStorage.getItem(`${role}Token`);
}

export function setSession(role: 'user' | 'seller' | 'admin' | 'delivery', token: string, user: unknown) {
  localStorage.setItem(`${role}Token`, token);
  localStorage.setItem(`${role}User`, JSON.stringify(user));
}

export function clearSession(role: 'user' | 'seller' | 'admin' | 'delivery') {
  localStorage.removeItem(`${role}Token`);
  localStorage.removeItem(`${role}User`);
}

export function getSessionUser<T = any>(role: 'user' | 'seller' | 'admin' | 'delivery' = 'user'): T | null {
  const raw = localStorage.getItem(`${role}User`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function parsePayload(text: string, contentType: string | null) {
  if (!text) return null;
  if (contentType?.includes('application/json')) return JSON.parse(text);
  try { return JSON.parse(text); } catch { return { message: text.slice(0, 400) }; }
}

function friendlyGatewayMessage(status: number) {
  if (status === 502 || status === 503 || status === 504) {
    return 'Backend service is unavailable right now. On Render, check the Web Service logs and confirm MONGODB_URI/JWT_SECRET are set, then redeploy the backend.';
  }
  return `Request failed with status ${status}`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? (isForm ? 120000 : 30000);
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(isForm ? 'Upload timed out. Please try a smaller image or check the backend service.' : 'Request timed out. Please try again or check the backend service logs.');
    }
    throw new Error('Could not connect to API server. Check VITE_API_URL and backend service.');
  } finally {
    window.clearTimeout(timer);
  }

  const text = await res.text();
  let payload: any = null;
  try {
    payload = parsePayload(text, res.headers.get('content-type'));
  } catch {
    payload = { message: text.slice(0, 400) };
  }

  if (!res.ok) {
    const message = payload?.message || payload?.error || friendlyGatewayMessage(res.status);
    throw new Error(message);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => apiFetch<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), token }),
  postWithTimeout: <T>(path: string, body: unknown, token: string | null | undefined, timeoutMs: number) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), token, timeoutMs }),
  put: <T>(path: string, body?: unknown, token?: string | null) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}), token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}), token }),
  delete: <T>(path: string, token?: string | null) => apiFetch<T>(path, { method: 'DELETE', token }),
  upload: <T>(path: string, formData: FormData, token?: string | null) => apiFetch<T>(path, { method: 'POST', body: formData, token, timeoutMs: 120000 }),
};


export function getSocketBaseUrl() {
  if (API_BASE_URL.endsWith('/api')) return API_BASE_URL.slice(0, -4);
  return API_BASE_URL;
}
