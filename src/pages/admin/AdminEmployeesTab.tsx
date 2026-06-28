import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Save, Trash2, UserPlus } from 'lucide-react';
import { api, getToken } from '../../lib/api';

type Employee = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  adminPosition?: string;
  adminPermissions?: string[];
  adminStatus?: 'active' | 'inactive';
};

const permissionLabels: Record<string, string> = {
  dashboard: 'Dashboard', sellers: 'Sellers', customers: 'Customers', products: 'Products', sales: 'Sales', banners: 'Banners', orders: 'Orders', returns: 'Returns', cancellations: 'Cancellations', messages: 'Order Messages', customerCare: 'Customer Care', promos: 'Promos/Vouchers', notifications: 'Notifications',
};

const defaultForm = { fullName: '', phone: '', position: '', password: '', permissions: [] as string[] };

export default function AdminEmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [permissions, setPermissions] = useState<string[]>(Object.keys(permissionLabels));
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedSet = useMemo(() => new Set(form.permissions), [form.permissions]);

  const load = async () => {
    setLoading(true);
    const [empRes, permRes] = await Promise.all([
      api.get<{ employees: Employee[] }>('/admin/employees', getToken('admin')),
      api.get<{ permissions: string[] }>('/admin/employee-permissions', getToken('admin')),
    ]);
    setEmployees(empRes.employees || []);
    setPermissions(permRes.permissions || Object.keys(permissionLabels));
    setLoading(false);
  };

  useEffect(() => { load().catch((e)=>{ setMessage(e instanceof Error ? e.message : 'Failed to load employees'); setLoading(false); }); }, []);

  const togglePermission = (key: string) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key) ? current.permissions.filter((p) => p !== key) : [...current.permissions, key],
    }));
  };

  const reset = () => { setForm(defaultForm); setEditingId(null); };

  const save = async () => {
    setSaving(true); setMessage('');
    try {
      if (editingId) {
        await api.put(`/admin/employees/${editingId}`, { ...form, adminPermissions: form.permissions }, getToken('admin'));
        setMessage('Employee updated.');
      } else {
        await api.post('/admin/employees', { ...form, adminPermissions: form.permissions }, getToken('admin'));
        setMessage('Employee ID created. Employee can login with phone and password.');
      }
      reset();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save employee');
    } finally { setSaving(false); }
  };

  const edit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({ fullName: employee.fullName || '', phone: employee.phone || '', position: employee.adminPosition || '', password: '', permissions: employee.adminPermissions || [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStatus = async (employee: Employee) => {
    await api.put(`/admin/employees/${employee.id}`, { adminStatus: employee.adminStatus === 'inactive' ? 'active' : 'inactive' }, getToken('admin'));
    await load();
  };

  const remove = async (employee: Employee) => {
    if (!window.confirm(`Delete employee ${employee.fullName}?`)) return;
    await api.delete(`/admin/employees/${employee.id}`, getToken('admin'));
    await load();
  };

  if (loading) return <div className="bg-white rounded-2xl p-10 border flex justify-center"><Loader2 className="animate-spin" /></div>;

  return <div className="space-y-5">
    <div className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-2 mb-4"><UserPlus className="text-blue-600" size={22}/><h2 className="font-black text-lg">{editingId ? 'Edit Employee Access' : 'Create Employee ID'}</h2></div>
      <div className="grid md:grid-cols-4 gap-3">
        <input className="border rounded-xl p-3 text-sm" placeholder="Employee name" value={form.fullName} onChange={(e)=>setForm({...form, fullName:e.target.value})}/>
        <input className="border rounded-xl p-3 text-sm" placeholder="Phone/login ID" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})}/>
        <input className="border rounded-xl p-3 text-sm" placeholder="Position" value={form.position} onChange={(e)=>setForm({...form, position:e.target.value})}/>
        <input className="border rounded-xl p-3 text-sm" type="password" placeholder={editingId ? 'New password optional' : 'Password'} value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})}/>
      </div>
      <div className="mt-4">
        <p className="text-xs font-black text-gray-600 mb-2">Admin access permissions</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {permissions.map((key) => <label key={key} className={`border rounded-xl px-3 py-2 text-sm font-bold cursor-pointer ${selectedSet.has(key) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-600'}`}>
            <input type="checkbox" className="mr-2" checked={selectedSet.has(key)} onChange={()=>togglePermission(key)}/>{permissionLabels[key] || key}
          </label>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="bg-blue-600 disabled:bg-blue-300 text-white rounded-xl px-5 py-3 font-black flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {editingId ? 'Update Employee' : 'Create Employee'}</button>
        {editingId && <button onClick={reset} className="bg-gray-100 text-gray-700 rounded-xl px-5 py-3 font-black">Cancel Edit</button>}
      </div>
      {message && <p className={`text-sm mt-3 ${message.includes('created') || message.includes('updated') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
    </div>

    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="p-5 border-b"><h3 className="font-black">Employee List</h3><p className="text-sm text-gray-500">Employees login from Admin Login using their phone number and password.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Position</th><th className="p-3">Access</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y">
        {employees.map((employee) => <tr key={employee.id}><td className="p-3 font-bold">{employee.fullName}</td><td className="p-3">{employee.phone}</td><td className="p-3">{employee.adminPosition}</td><td className="p-3 max-w-md"><div className="flex flex-wrap gap-1">{(employee.adminPermissions || []).map((p)=><span key={p} className="bg-gray-100 rounded-full px-2 py-1 text-[11px] font-bold text-gray-600">{permissionLabels[p] || p}</span>)}</div></td><td className="p-3"><button onClick={()=>toggleStatus(employee)} className={`rounded-full px-3 py-1 text-xs font-black ${employee.adminStatus === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{employee.adminStatus === 'inactive' ? 'Inactive' : 'Active'}</button></td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={()=>edit(employee)} className="p-2 rounded-lg bg-blue-50 text-blue-700"><Pencil size={15}/></button><button onClick={()=>remove(employee)} className="p-2 rounded-lg bg-red-50 text-red-700"><Trash2 size={15}/></button></div></td></tr>)}
        {!employees.length && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No employee IDs created yet.</td></tr>}
      </tbody></table></div>
    </div>
  </div>;
}
