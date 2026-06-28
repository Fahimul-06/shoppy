import React, { useState } from 'react';
import { Check, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

type Props<T = any> = {
  role: 'user' | 'seller';
  token: string | null;
  basePath: '/auth' | '/seller';
  currentEmail?: string;
  onChanged?: (account: T) => void;
};

export default function EmailOtpPanel({ role, token, basePath, currentEmail, onChanged }: Props) {
  const [newEmail, setNewEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const requestOtp = async () => {
    if (!newEmail.trim()) { setMessage('Enter the new email first'); return; }
    setLoading(true); setMessage(''); setDevOtp('');
    try {
      const res = await api.post<{ message: string; sent: boolean; emailSent?: boolean; devOtp?: string }>(`${basePath}/email/request-otp`, { email: newEmail.trim() }, token);
      setOtpSent(true);
      setMessage(res.message || 'OTP sent to new email');
      if (res.devOtp) setDevOtp(res.devOtp);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not send OTP'); }
    finally { setLoading(false); }
  };

  const changeEmail = async () => {
    if (!otp.trim()) { setMessage('Enter the OTP first'); return; }
    setLoading(true); setMessage('');
    try {
      const res = await api.post<{ message: string; user?: any; seller?: any }>(`${basePath}/email/change`, { otp }, token);
      const account = role === 'seller' ? res.seller : res.user;
      if (account) onChanged?.(account);
      setMessage(res.message || 'Email changed successfully');
      setOtp(''); setNewEmail(''); setOtpSent(false); setDevOtp('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Email change failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h2 className="font-bold text-gray-800 mb-2 flex gap-2 items-center"><Mail size={17}/> Change Email</h2>
      <p className="text-xs text-gray-500 mb-4">Current email: <b>{currentEmail || 'Not added'}</b>. OTP will be sent to the new email address.</p>
      <div className="space-y-3">
        <input className="w-full border rounded-xl px-4 py-3 text-sm" placeholder="New email address" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} disabled={loading || otpSent}/>
        <button type="button" onClick={requestOtp} disabled={loading || otpSent} className="w-full border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={15}/> : <ShieldCheck size={15}/>} Send Email OTP
        </button>
      </div>
      {otpSent && <div className="space-y-3 mt-3">
        <input className="w-full border rounded-xl px-4 py-3 text-sm" placeholder="6-digit OTP" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}/>
        <button type="button" onClick={changeEmail} disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={15}/> : <Check size={15}/>} Verify OTP & Change Email
        </button>
        <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setDevOtp(''); setMessage(''); }} className="w-full text-sm text-gray-500 hover:text-orange-500">Use another email</button>
      </div>}
      {devOtp && <p className="mt-3 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-3">SMTP is not configured yet. Temporary testing OTP: <b>{devOtp}</b></p>}
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
