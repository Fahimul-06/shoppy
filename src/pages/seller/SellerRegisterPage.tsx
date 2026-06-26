import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, User, Phone, MapPin, Lock, Eye, EyeOff,
  Camera, FileText, ChevronRight, ChevronLeft, Check,
  Upload, AlertCircle, Loader2, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const STEPS = ['Personal Info', 'Shop Details', 'Documents', 'Review'];

interface FormData {
  name: string;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
  shopName: string;
  shopAddress: string;
  nidFront: File | null;
  nidBack: File | null;
  tradeLicense: File | null;
}

const initial: FormData = {
  name: '', phone: '', address: '', password: '', confirmPassword: '',
  shopName: '', shopAddress: '',
  nidFront: null, nidBack: null, tradeLicense: null,
};

function FileUploadBox({
  label, hint, value, onChange,
}: {
  label: string; hint: string;
  value: File | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = value ? URL.createObjectURL(value) : null;

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
          value ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
        }`}
        style={{ height: 140 }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-white text-sm font-semibold">Change photo</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Upload size={18} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 text-center">{hint}</p>
            <span className="text-xs text-orange-500 font-semibold">Click to upload</span>
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function InputField({
  label, icon: Icon, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: React.ElementType }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          {...props}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
}

export default function SellerRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initial);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (k: keyof FormData, v: string | File | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (s: number): boolean => {
    const e: typeof errors = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Full name is required';
      if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, '')))
        e.phone = 'Enter a valid BD phone number (01XXXXXXXXX)';
      if (!form.address.trim()) e.address = 'Address is required';
      if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    if (s === 1) {
      if (!form.shopName.trim()) e.shopName = 'Shop name is required';
      if (!form.shopAddress.trim()) e.shopAddress = 'Shop address is required';
    }
    if (s === 2) {
      if (!form.nidFront) e.nidFront = 'NID front photo is required';
      if (!form.nidBack) e.nidBack = 'NID back photo is required';
      if (!form.tradeLicense) e.tradeLicense = 'Trade license photo is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const uploadFile = async (userId: string, file: File, name: string) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${name}.${ext}`;
    const { error } = await supabase.storage
      .from('seller-documents')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('seller-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!validate(2)) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const phone = form.phone.replace(/\s/g, '');
      const email = `${phone}@seller.shopbd.com`;

      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: { data: { role: 'seller' } },
      });
      if (signUpErr) throw signUpErr;
      if (!authData.user) throw new Error('Account creation failed.');

      const uid = authData.user.id;

      const [nidFrontUrl, nidBackUrl, tradeLicenseUrl] = await Promise.all([
        uploadFile(uid, form.nidFront!, 'nid_front'),
        uploadFile(uid, form.nidBack!, 'nid_back'),
        uploadFile(uid, form.tradeLicense!, 'trade_license'),
      ]);

      const { error: sellerErr } = await supabase.from('sellers').insert({
        id: uid,
        name: form.name.trim(),
        phone,
        address: form.address.trim(),
        shop_name: form.shopName.trim(),
        shop_address: form.shopAddress.trim(),
        nid_front_url: nidFrontUrl,
        nid_back_url: nidBackUrl,
        trade_license_url: tradeLicenseUrl,
        status: 'pending',
      });
      if (sellerErr) throw sellerErr;

      navigate('/seller/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(msg.includes('already registered') ? 'This phone number is already registered.' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-orange-100 bg-white/80 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-gray-900 text-lg">Seller Center</span>
        </Link>
        <Link to="/seller/login" className="text-sm text-orange-500 font-semibold hover:text-orange-600 transition-colors">
          Already a seller? Sign in
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Progress steps */}
          <div className="flex items-center mb-8">
            {STEPS.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? <Check size={16} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1.5 font-semibold whitespace-nowrap ${
                    i === step ? 'text-orange-500' : i < step ? 'text-green-500' : 'text-gray-400'
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
              <h1 className="text-white font-bold text-lg">{STEPS[step]}</h1>
              <p className="text-orange-100 text-xs mt-0.5">Step {step + 1} of {STEPS.length}</p>
            </div>

            <div className="p-6">
              {/* ── Step 0: Personal Info ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <InputField label="Full Name" icon={User} placeholder="Your legal full name"
                    value={form.name} onChange={(e) => set('name', e.target.value)} />
                  {errors.name && <p className="text-red-500 text-xs -mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.name}</p>}

                  <InputField label="Phone Number" icon={Phone} placeholder="01XXXXXXXXX"
                    value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  {errors.phone && <p className="text-red-500 text-xs -mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.phone}</p>}

                  <InputField label="Personal Address" icon={MapPin} placeholder="Your home / personal address"
                    value={form.address} onChange={(e) => set('address', e.target.value)} />
                  {errors.address && <p className="text-red-500 text-xs -mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.address}</p>}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        placeholder="Minimum 8 characters"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors"
                      />
                      <button type="button" onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showCpw ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        value={form.confirmPassword}
                        onChange={(e) => set('confirmPassword', e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors"
                      />
                      <button type="button" onClick={() => setShowCpw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.confirmPassword}</p>}
                  </div>
                </div>
              )}

              {/* ── Step 1: Shop Details ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <InputField label="Shop Name" icon={Store} placeholder="Your shop / business name"
                    value={form.shopName} onChange={(e) => set('shopName', e.target.value)} />
                  {errors.shopName && <p className="text-red-500 text-xs -mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.shopName}</p>}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <MapPin size={14} className="inline mr-1.5 text-gray-400" />Shop Address
                    </label>
                    <textarea
                      placeholder="Full shop address including area, city, district"
                      value={form.shopAddress}
                      onChange={(e) => set('shopAddress', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors resize-none"
                    />
                    {errors.shopAddress && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.shopAddress}</p>}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-blue-700 text-sm font-semibold mb-1">What happens next?</p>
                    <p className="text-blue-600 text-xs leading-relaxed">
                      After registration, your account will be reviewed within 24–48 hours.
                      You will be able to add products once your account is approved.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 2: Documents ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    Upload clear, high-resolution photos. All documents are kept strictly private and secure.
                  </p>

                  <FileUploadBox
                    label="NID Front Photo"
                    hint="Front side of your National ID Card"
                    value={form.nidFront}
                    onChange={(f) => set('nidFront', f)}
                  />
                  {errors.nidFront && <p className="text-red-500 text-xs -mt-3 flex items-center gap-1"><AlertCircle size={12} />{errors.nidFront}</p>}

                  <FileUploadBox
                    label="NID Back Photo"
                    hint="Back side of your National ID Card"
                    value={form.nidBack}
                    onChange={(f) => set('nidBack', f)}
                  />
                  {errors.nidBack && <p className="text-red-500 text-xs -mt-3 flex items-center gap-1"><AlertCircle size={12} />{errors.nidBack}</p>}

                  <FileUploadBox
                    label="Trade License"
                    hint="Your valid business trade license"
                    value={form.tradeLicense}
                    onChange={(f) => set('tradeLicense', f)}
                  />
                  {errors.tradeLicense && <p className="text-red-500 text-xs -mt-3 flex items-center gap-1"><AlertCircle size={12} />{errors.tradeLicense}</p>}
                </div>
              )}

              {/* ── Step 3: Review ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { label: 'Full Name', value: form.name, icon: User },
                      { label: 'Phone Number', value: form.phone, icon: Phone },
                      { label: 'Personal Address', value: form.address, icon: MapPin },
                      { label: 'Shop Name', value: form.shopName, icon: Store },
                      { label: 'Shop Address', value: form.shopAddress, icon: MapPin },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <Icon size={15} className="text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'NID Front', file: form.nidFront },
                      { label: 'NID Back', file: form.nidBack },
                      { label: 'Trade License', file: form.tradeLicense },
                    ].map(({ label, file }) => (
                      <div key={label} className="text-center">
                        {file && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={label}
                            className="w-full h-20 object-cover rounded-xl border border-gray-200 mb-1"
                          />
                        )}
                        <div className="flex items-center justify-center gap-1">
                          <Check size={12} className="text-green-500" />
                          <p className="text-xs text-gray-500">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-red-600 text-sm">{submitError}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    By registering you agree to our Seller Terms & Conditions and Privacy Policy.
                  </p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={back}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={next}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><Check size={16} /> Submit Registration</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
