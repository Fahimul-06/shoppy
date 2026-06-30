import React, { useEffect, useState } from 'react';
import { Loader2, Save, Settings, UserCircle2, Receipt } from 'lucide-react';
import { api, getSessionUser, getToken, setSession } from '../../lib/api';
import { defaultPlatformSettings, normalizePlatformSettings, type PlatformSettings } from '../../lib/platformSettings';

type AdminSettings = { fullName: string; email: string; password: string };

export default function AdminSettingsTab() {
  const sessionAdmin = getSessionUser<any>('admin');
  const [profile, setProfile] = useState<AdminSettings>({ fullName: sessionAdmin?.fullName || '', email: sessionAdmin?.email || '', password: '' });
  const [settings, setSettings] = useState<PlatformSettings>(defaultPlatformSettings);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCharges, setSavingCharges] = useState(false);
  const [message, setMessage] = useState('');
  const isOwner = sessionAdmin?.adminType !== 'employee';

  useEffect(() => {
    setLoading(true);
    api.get<{ settings: PlatformSettings }>('/admin/platform-settings', getToken('admin'))
      .then((res) => setSettings(normalizePlatformSettings(res.settings)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    setMessage('');
    try {
      const res = await api.put<{ user: any }>('/admin/settings', profile, getToken('admin'));
      setSession('admin', getToken('admin') || '', res.user);
      setProfile({ fullName: res.user.fullName || '', email: res.user.email || '', password: '' });
      setMessage('Profile settings saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save profile settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCharges = async () => {
    setSavingCharges(true);
    setMessage('');
    try {
      const res = await api.put<{ settings: PlatformSettings }>('/admin/platform-settings', settings, getToken('admin'));
      setSettings(normalizePlatformSettings(res.settings));
      setMessage('Checkout charges saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save checkout charges');
    } finally {
      setSavingCharges(false);
    }
  };

  if (loading) return <div className="bg-white rounded-2xl p-10 border flex justify-center"><Loader2 className="animate-spin" /></div>;

  return <div className="grid lg:grid-cols-2 gap-5">
    <div className="bg-white rounded-2xl p-6 border space-y-3">
      <div className="flex items-center gap-2 mb-2"><UserCircle2 className="text-blue-600" size={22}/><h2 className="font-black text-lg">Admin Profile Settings</h2></div>
      <input className="w-full border rounded-xl p-3 text-sm" placeholder="Name" value={profile.fullName} onChange={e=>setProfile({...profile, fullName:e.target.value})}/>
      <input className="w-full border rounded-xl p-3 text-sm" placeholder="Email" value={profile.email} onChange={e=>setProfile({...profile, email:e.target.value})}/>
      <input className="w-full border rounded-xl p-3 text-sm" type="password" placeholder="New password optional" value={profile.password} onChange={e=>setProfile({...profile, password:e.target.value})}/>
      <button onClick={saveProfile} disabled={savingProfile} className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">{savingProfile ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Profile</button>
      {message && <p className={`text-sm ${message.includes('saved') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
    </div>

    <div className="bg-white rounded-2xl p-6 border space-y-3">
      <div className="flex items-center gap-2 mb-2"><Receipt className="text-orange-600" size={22}/><h2 className="font-black text-lg">Checkout Charges</h2></div>
      {!isOwner && <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 font-semibold">Only owner admin can change checkout charges.</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="text-xs font-bold text-gray-600">Delivery charge</span><input disabled={!isOwner} type="number" min="0" className="mt-1 w-full border rounded-xl p-3 text-sm disabled:bg-gray-100" value={settings.deliveryCharge} onChange={(e)=>setSettings({...settings, deliveryCharge: Number(e.target.value || 0)})}/></label>
        <label className="block"><span className="text-xs font-bold text-gray-600">Free delivery minimum</span><input disabled={!isOwner} type="number" min="0" className="mt-1 w-full border rounded-xl p-3 text-sm disabled:bg-gray-100" value={settings.freeDeliveryMin} onChange={(e)=>setSettings({...settings, freeDeliveryMin: Number(e.target.value || 0)})}/></label>
        <label className="block"><span className="text-xs font-bold text-gray-600">Platform fee type</span><select disabled={!isOwner} className="mt-1 w-full border rounded-xl p-3 text-sm disabled:bg-gray-100" value={settings.platformFeeType} onChange={(e)=>setSettings({...settings, platformFeeType: e.target.value === 'percent' ? 'percent' : 'fixed'})}><option value="fixed">Fixed amount</option><option value="percent">Percentage</option></select></label>
        <label className="block"><span className="text-xs font-bold text-gray-600">Platform fee {settings.platformFeeType === 'percent' ? '%' : '৳'}</span><input disabled={!isOwner} type="number" min="0" className="mt-1 w-full border rounded-xl p-3 text-sm disabled:bg-gray-100" value={settings.platformFee} onChange={(e)=>setSettings({...settings, platformFee: Number(e.target.value || 0)})}/></label>
        <label className="block"><span className="text-xs font-bold text-gray-600">VAT %</span><input disabled={!isOwner} type="number" min="0" max="100" className="mt-1 w-full border rounded-xl p-3 text-sm disabled:bg-gray-100" value={settings.vatPercent} onChange={(e)=>setSettings({...settings, vatPercent: Number(e.target.value || 0)})}/></label>
        <div className="flex items-end"><button onClick={saveCharges} disabled={!isOwner || savingCharges} className="w-full bg-slate-900 disabled:bg-slate-300 text-white rounded-xl py-3 font-black flex items-center justify-center gap-2">{savingCharges ? <Loader2 size={16} className="animate-spin"/> : <Settings size={16}/>} Save Charges</button></div>
      </div>
    </div>
  </div>;
}
