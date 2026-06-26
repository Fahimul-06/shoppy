export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function getToken() {
  return localStorage.getItem('shoppy_token');
}

export function setSession(token: string, user: unknown) {
  localStorage.setItem('shoppy_token', token);
  localStorage.setItem('shoppy_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('shoppy_token');
  localStorage.removeItem('shoppy_user');
}

export function getStoredUser<T = any>(): T | null {
  try {
    const raw = localStorage.getItem('shoppy_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || `Request failed: ${response.status}`);
  return data as T;
}

export async function login(email: string, password: string, role?: 'customer' | 'seller' | 'admin') {
  const data = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
  setSession(data.token, data.user);
  return data.user;
}

export async function register(payload: Record<string, unknown>) {
  const data = await apiFetch<{ token: string; user: any }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setSession(data.token, data.user);
  return data.user;
}
