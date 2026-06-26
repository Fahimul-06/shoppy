type AuthUser = { id: string; email: string; role?: string };
type Filter = { field: string; op: 'eq'; value: unknown };

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const STORAGE_TOKEN = 'shoppy_auth_token';
const STORAGE_USER = 'shoppy_auth_user';

const listeners = new Set<(event: string, session: { user: AuthUser } | null) => void>();
const fileUrls = new Map<string, string>();

function getToken() {
  return localStorage.getItem(STORAGE_TOKEN) || '';
}

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

function setSession(token: string, user: AuthUser) {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  listeners.forEach((listener) => listener('SIGNED_IN', { user }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  listeners.forEach((listener) => listener('SIGNED_OUT', null));
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

class QueryBuilder {
  private table: string;
  private filters: Filter[] = [];
  private orderField = '';
  private orderAscending = true;
  private limitCount?: number;
  private rawOr = '';
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: unknown;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';
  private head = false;
  private countMode = '';

  constructor(table: string) { this.table = table; }

  select(_columns = '*', options?: { count?: string; head?: boolean }) {
    this.action = this.action === 'select' ? 'select' : this.action;
    this.head = Boolean(options?.head);
    this.countMode = options?.count || '';
    return this;
  }

  eq(field: string, value: unknown) { this.filters.push({ field, op: 'eq', value }); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.orderField = field; this.orderAscending = options?.ascending ?? true; return this; }
  limit(value: number) { this.limitCount = value; return this; }
  or(value: string) { this.rawOr = value; return this; }
  maybeSingle() { this.singleMode = 'maybeSingle'; return this; }
  single() { this.singleMode = 'single'; return this; }
  insert(payload: unknown) { this.action = 'insert'; this.payload = payload; return this; }
  upsert(payload: unknown) { this.action = 'upsert'; this.payload = payload; return this; }
  update(payload: unknown) { this.action = 'update'; this.payload = payload; return this; }
  delete() { this.action = 'delete'; return this; }

  private queryString() {
    const params = new URLSearchParams();
    if (this.filters.length) params.set('filters', JSON.stringify(this.filters));
    if (this.orderField) {
      params.set('orderField', this.orderField);
      params.set('orderAscending', String(this.orderAscending));
    }
    if (this.limitCount != null) params.set('limit', String(this.limitCount));
    if (this.rawOr) params.set('or', this.rawOr);
    if (this.head) params.set('head', 'true');
    if (this.countMode) params.set('count', this.countMode);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async execute(): Promise<any> {
    try {
      let result: { data?: unknown; count?: number };
      const qs = this.queryString();
      if (this.action === 'select') {
        result = await request(`/${this.table}${qs}`);
      } else if (this.action === 'insert') {
        result = await request(`/${this.table}`, { method: 'POST', body: JSON.stringify(this.payload) });
      } else if (this.action === 'upsert') {
        result = await request(`/${this.table}/upsert`, { method: 'PUT', body: JSON.stringify(this.payload) });
      } else if (this.action === 'update') {
        result = await request(`/${this.table}${qs}`, { method: 'PATCH', body: JSON.stringify(this.payload) });
      } else {
        result = await request(`/${this.table}${qs}`, { method: 'DELETE' });
      }
      let data = result.data;
      if (this.singleMode !== 'none' && Array.isArray(data)) data = data[0] ?? null;
      return { data, count: result.count ?? null, error: null };
    } catch (error) {
      return { data: this.singleMode === 'none' ? [] : null, count: null, error };
    }
  }

  then(onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: unknown) => any) | null): Promise<any> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export const supabase: any = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const { token, user } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        setSession(token, user);
        return { data: { user, session: { user, access_token: token } }, error: null };
      } catch (error) { return { data: { user: null, session: null }, error }; }
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      try {
        const body = { email, password, ...(options?.data || {}) };
        const { token, user } = await request('/auth/signup', { method: 'POST', body: JSON.stringify(body) });
        setSession(token, user);
        return { data: { user, session: { user, access_token: token } }, error: null };
      } catch (error) { return { data: { user: null, session: null }, error }; }
    },
    async getUser() {
      const user = getStoredUser();
      return { data: { user }, error: null };
    },
    async signOut() { clearSession(); return { error: null }; },
    async updateUser(payload: { email?: string; password?: string }) {
      try {
        const { user } = await request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) });
        const token = getToken();
        if (token) setSession(token, user);
        return { data: { user }, error: null };
      } catch (error) { return { data: { user: null }, error }; }
    },
    onAuthStateChange(callback: (event: string, session: { user: AuthUser } | null) => void) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => { listeners.delete(callback); } } } };
    },
  },
  from(table: string) { return new QueryBuilder(table); },
  rpc(name: string) {
    if (name !== 'claim_first_admin') return Promise.resolve({ data: null, error: new Error('Unknown RPC') });
    return request('/admin/claim-first', { method: 'POST', body: JSON.stringify({}) })
      .then(({ result, token, user }) => { if (token && user) setSession(token, user); return { data: result, error: null }; })
      .catch((error) => ({ data: null, error }));
  },
  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, file: File, _options?: Record<string, unknown>) {
          fileUrls.set(path, URL.createObjectURL(file));
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: fileUrls.get(path) || `/uploads/${path}` } };
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: fileUrls.get(path) || `/uploads/${path}` }, error: null };
        },
      };
    },
  },
};
