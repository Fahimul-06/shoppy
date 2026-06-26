import React, { useMemo, useState } from 'react';
import { Check, Loader2, LocateFixed, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

type Address = {
  id?: string;
  label?: string;
  name?: string;
  phone?: string;
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

type UserLike = {
  fullName?: string;
  phone?: string;
  addresses?: Address[];
};

const emptyAddress: Address = {
  label: 'Home',
  name: '',
  phone: '',
  division: '',
  district: '',
  area: '',
  address: '',
  landmark: '',
  isDefault: true,
};

export default function AddressManager({ token, user, onChanged }: { token: string | null; user: UserLike; onChanged: (user: any) => void }) {
  const [form, setForm] = useState<Address>({ ...emptyAddress, name: user.fullName || '', phone: user.phone || '' });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const addresses = useMemo(() => user.addresses || [], [user.addresses]);

  const update = (key: keyof Address, value: string | number | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const syncUser = (updatedUser: any) => {
    if (updatedUser) onChanged(updatedUser);
  };

  const useCurrentLocation = async () => {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('Current location is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = Number(position.coords.latitude.toFixed(7));
      const longitude = Number(position.coords.longitude.toFixed(7));
      try {
        const res = await api.get<{ address: Address; warning?: string }>(`/auth/reverse-geocode?lat=${latitude}&lng=${longitude}`, token);
        setForm((prev) => ({
          ...prev,
          ...res.address,
          latitude,
          longitude,
          name: prev.name || user.fullName || '',
          phone: prev.phone || user.phone || '',
        }));
        setMessage(res.warning || 'Current location captured. Please check the address text before saving.');
      } catch (error) {
        setForm((prev) => ({ ...prev, latitude, longitude }));
        setMessage('Location captured. Please type the address details manually.');
      } finally {
        setLocating(false);
      }
    }, (error) => {
      setMessage(error.message || 'Location permission was denied.');
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };

  const saveAddress = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post<{ user: any; addresses: Address[] }>('/auth/addresses', form, token);
      syncUser(res.user);
      setForm({ ...emptyAddress, name: user.fullName || '', phone: user.phone || '' });
      setMessage('Address saved successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save address');
    } finally {
      setLoading(false);
    }
  };

  const setDefault = async (address: Address) => {
    if (!address.id) return;
    setLoading(true);
    try {
      const res = await api.put<{ user: any }>(`/auth/addresses/${address.id}`, { isDefault: true }, token);
      syncUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const removeAddress = async (address: Address) => {
    if (!address.id) return;
    setLoading(true);
    try {
      const res = await api.delete<{ user: any }>(`/auth/addresses/${address.id}`, token);
      syncUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><MapPin size={20}/> Delivery Addresses</h2>
          <p className="text-sm text-gray-500">Save address manually or use device current location.</p>
        </div>
        <button onClick={useCurrentLocation} disabled={locating} className="bg-blue-50 text-blue-600 border border-blue-100 font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">
          {locating ? <Loader2 className="animate-spin" size={15}/> : <LocateFixed size={15}/>} Use Current Location
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input className="border rounded-xl px-4 py-3 text-sm" placeholder="Label, e.g. Home / Office" value={form.label || ''} onChange={(e)=>update('label', e.target.value)} />
        <input className="border rounded-xl px-4 py-3 text-sm" placeholder="Receiver name" value={form.name || ''} onChange={(e)=>update('name', e.target.value)} />
        <input className="border rounded-xl px-4 py-3 text-sm" placeholder="Receiver phone" value={form.phone || ''} onChange={(e)=>update('phone', e.target.value)} />
        <input className="border rounded-xl px-4 py-3 text-sm" placeholder="Division" value={form.division || ''} onChange={(e)=>update('division', e.target.value)} />
        <input className="border rounded-xl px-4 py-3 text-sm" placeholder="District / City" value={form.district || ''} onChange={(e)=>update('district', e.target.value)} />
        <input className="border rounded-xl px-4 py-3 text-sm" placeholder="Area / Road" value={form.area || ''} onChange={(e)=>update('area', e.target.value)} />
        <textarea className="sm:col-span-2 border rounded-xl px-4 py-3 text-sm min-h-[90px]" placeholder="Full address" value={form.address || ''} onChange={(e)=>update('address', e.target.value)} />
        <input className="sm:col-span-2 border rounded-xl px-4 py-3 text-sm" placeholder="Landmark / delivery note" value={form.landmark || ''} onChange={(e)=>update('landmark', e.target.value)} />
        {(form.latitude && form.longitude) ? <p className="sm:col-span-2 text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2">Location: {form.latitude}, {form.longitude}</p> : null}
        <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={Boolean(form.isDefault)} onChange={(e)=>update('isDefault', e.target.checked)} /> Set as default address</label>
        {message && <p className="sm:col-span-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">{message}</p>}
        <button onClick={saveAddress} disabled={loading} className="sm:col-span-2 bg-orange-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={15}/> : <Plus size={15}/>} Save Address
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-5">
        {addresses.length === 0 ? <div className="md:col-span-2 border border-dashed rounded-2xl p-5 text-center text-gray-500 text-sm">No saved address yet.</div> : addresses.map((addr) => (
          <div key={addr.id || addr.address} className="border rounded-2xl p-4 bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-gray-900 flex items-center gap-2">{addr.label || 'Address'} {addr.isDefault && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Default</span>}</p>
                <p className="text-sm text-gray-700 mt-1">{addr.name} {addr.phone ? `• ${addr.phone}` : ''}</p>
                <p className="text-sm text-gray-600 mt-1">{addr.address || [addr.area, addr.district, addr.division].filter(Boolean).join(', ')}</p>
                {addr.latitude && addr.longitude && <p className="text-xs text-gray-400 mt-1">{addr.latitude}, {addr.longitude}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {!addr.isDefault && <button onClick={()=>setDefault(addr)} className="text-xs font-bold px-3 py-2 rounded-lg bg-white border text-gray-700 flex items-center gap-1"><Star size={13}/> Default</button>}
              <button onClick={()=>removeAddress(addr)} className="text-xs font-bold px-3 py-2 rounded-lg bg-white border text-red-500 flex items-center gap-1"><Trash2 size={13}/> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
