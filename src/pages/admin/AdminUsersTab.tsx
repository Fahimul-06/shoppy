import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, RefreshCw, KeyRound, Save } from 'lucide-react';
import { apiFetch, getStoredUser } from '../../lib/api';

type Role = 'customer' | 'seller' | 'admin';
type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected';

type AdminUser = {
  id: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: Role;
  sellerStatus: SellerStatus;
  shopName?: string;
  businessType?: string;
  address?: string;
  createdAt: string;
};

const roles: Role[] = ['customer', 'seller', 'admin'];
const sellerStatuses: SellerStatus[] = ['none', 'pending', 'approved', 'rejected'];

export default function AdminUsersTab() {
  const currentUser = getStoredUser<AdminUser>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (roleFilter) params.set('role', roleFilter);
    if (search.trim()) params.set('search', search.trim());
    return params.toString() ? `?${params.toString()}` : '';
  }, [roleFilter, search]);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      setUsers(await apiFetch<AdminUser[]>(`/api/admin/users${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [query]);

  const updateUser = async (id: string, payload: Partial<AdminUser>) => {
    setSavingId(id);
    setError('');
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingId('');
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      setError('You cannot delete your own admin account while logged in.');
      return;
    }
    if (!confirm(`Delete ${user.email}? Seller products will be unpublished if this is a seller.`)) return;
    setSavingId(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSavingId('');
    }
  };

  const resetPassword = async () => {
    if (!passwordUser) return;
    setError('');
    try {
      await apiFetch(`/api/admin/users/${passwordUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">Manage customers, sellers, and admin accounts.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, shop"
              className="w-full sm:w-72 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">All roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={load} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[1050px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Phone / Address</th>
              <th className="p-3">Role</th>
              <th className="p-3">Seller Status</th>
              <th className="p-3 text-left">Shop</th>
              <th className="p-3 text-left">Joined</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading users...</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No users found.</td></tr>}
            {!loading && users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100 align-top">
                <td className="p-3">
                  <p className="font-bold text-gray-900">{user.fullName || 'No name'}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.id === currentUser?.id && <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Current admin</span>}
                </td>
                <td className="p-3">
                  <p>{user.phone || '-'}</p>
                  <p className="text-xs text-gray-400 line-clamp-2 max-w-[220px]">{user.address || '-'}</p>
                </td>
                <td className="p-3 text-center">
                  <select
                    value={user.role}
                    disabled={savingId === user.id}
                    onChange={(e) => updateUser(user.id, { role: e.target.value as Role })}
                    className="border rounded-lg px-2 py-1 capitalize"
                  >
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-3 text-center">
                  <select
                    value={user.sellerStatus || 'none'}
                    disabled={savingId === user.id || user.role !== 'seller'}
                    onChange={(e) => updateUser(user.id, { sellerStatus: e.target.value as SellerStatus })}
                    className="border rounded-lg px-2 py-1 capitalize disabled:bg-gray-100"
                  >
                    {sellerStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <p className="font-semibold">{user.shopName || '-'}</p>
                  <p className="text-xs text-gray-400">{user.businessType || ''}</p>
                </td>
                <td className="p-3 text-gray-500 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setPasswordUser(user)} className="text-blue-600 hover:text-blue-700" title="Reset password"><KeyRound size={16} /></button>
                    <button onClick={() => deleteUser(user)} disabled={savingId === user.id || user.id === currentUser?.id} className="text-red-600 disabled:text-gray-300" title="Delete user"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {passwordUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-extrabold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">Set a new password for {passwordUser.email}</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password, minimum 6 characters"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setPasswordUser(null); setNewPassword(''); }} className="flex-1 border rounded-xl py-2 font-semibold">Cancel</button>
              <button onClick={resetPassword} className="flex-1 bg-blue-600 text-white rounded-xl py-2 font-bold flex items-center justify-center gap-2"><Save size={14}/> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
