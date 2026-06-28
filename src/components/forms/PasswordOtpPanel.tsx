import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

type Props = {
  role: 'user' | 'seller';
  token: string | null;
  basePath: '/auth' | '/seller';
  email?: string;
  phone?: string;
};

export default function PasswordOtpPanel({ role, token, basePath, email, phone }: Props) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const requestOtp = async () => {
    setLoading(true);
    setMessage('');
    setDevOtp('');
    try {
      const res = await api.post<{ message: string; sent: boolean; smsSent?: boolean; emailSent?: boolean; devOtp?: string }>(`${basePath}/password/request-otp`, {}, token);
      setOtpSent(true);
      setMessage(res.message || 'OTP sent');
      if (res.devOtp) setDevOtp(res.devOtp);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!otp.trim()) { setMessage('Enter the OTP first'); return; }
    if (newPassword.length < 6) { setMessage('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setMessage('Passwords do not match'); return; }
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post<{ message: string }>(`${basePath}/password/change`, { otp, newPassword }, token);
      setMessage(res.message || 'Password changed successfully');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpSent(false);
      setDevOtp('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h2 className="font-bold text-gray-800 mb-2 flex gap-2 items-center"><KeyRound size={17}/> Change Password</h2>
      <p className="text-xs text-gray-500 mb-4">OTP will be sent to {phone || email || `your ${role} phone/email`} and expires in 10 minutes.</p>

      <button
        type="button"
        onClick={requestOtp}
        disabled={loading}
        className="w-full border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 font-bold py-3 rounded-xl flex items-center justify-center gap-2 mb-3"
      >
        {loading ? <Loader2 className="animate-spin" size={15}/> : <ShieldCheck size={15}/>} Send OTP
      </button>

      {otpSent && (
        <div className="space-y-3">
          <input className="w-full border rounded-xl px-4 py-3 text-sm" placeholder="6-digit OTP" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}/>
          <div className="relative">
            <input className="w-full border rounded-xl px-4 py-3 pr-11 text-sm" type={showPassword ? 'text' : 'password'} placeholder="New password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)}/>
            <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          </div>
          <input className="w-full border rounded-xl px-4 py-3 text-sm" type={showPassword ? 'text' : 'password'} placeholder="Confirm new password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)}/>
          <button type="button" onClick={changePassword} disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={15}/> : <Check size={15}/>} Verify OTP & Change Password
          </button>
        </div>
      )}

      {devOtp && <p className="mt-3 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-3">SMS/SMTP is not configured yet. Temporary testing OTP: <b>{devOtp}</b></p>}
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
