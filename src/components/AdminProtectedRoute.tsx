import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { apiFetch, clearSession, getStoredUser } from '../lib/api';

type AuthUser = {
  id: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  fullName?: string;
};

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const storedUser = getStoredUser<AuthUser>();

  useEffect(() => {
    let alive = true;

    async function verifyAdmin() {
      if (!storedUser || storedUser.role !== 'admin') {
        clearSession();
        if (alive) setStatus('blocked');
        return;
      }

      try {
        const data = await apiFetch<{ user: AuthUser }>('/api/auth/me');
        if (data.user?.role !== 'admin') {
          clearSession();
          if (alive) setStatus('blocked');
          return;
        }
        if (alive) setStatus('allowed');
      } catch {
        clearSession();
        if (alive) setStatus('blocked');
      }
    }

    verifyAdmin();
    return () => { alive = false; };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-3 text-slate-200 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Checking admin access</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Loader2 size={12} className="animate-spin" /> Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'blocked') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
