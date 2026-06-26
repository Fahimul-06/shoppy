import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, Ban, RotateCcw, X,
  Loader2, User, Phone, MapPin, Store, FileText, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Seller {
  id: string; name: string; phone: string; address: string;
  shop_name: string; shop_address: string; status: string;
  rejection_reason: string | null;
  nid_front_url: string | null; nid_back_url: string | null;
  trade_license_url: string | null; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  blocked:  'bg-slate-200 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function SignedImg({ storagePath, alt }: { storagePath: string; alt: string }) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storagePath) return;
    (async () => {
      const { data } = await supabase.storage
        .from('seller-documents')
        .createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) setSrc(data.signedUrl);
      setLoading(false);
    })();
  }, [storagePath]);

  if (loading) return <div className="h-28 bg-gray-100 rounded-xl flex items-center justify-center"><Loader2 size={18} className="animate-spin text-gray-400" /></div>;
  if (!src) return <div className="h-28 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs">Unavailable</div>;
  return <img src={src} alt={alt} className="w-full h-28 object-cover rounded-xl border border-gray-200" />;
}

export default function AdminSellersTab() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Seller | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false });
    setSellers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, string>) => {
    setUpdating(id);
    const { error } = await supabase
      .from('sellers')
      .update({ status, ...extra })
      .eq('id', id);
    if (!error) {
      setSellers((prev) => prev.map((s) => s.id === id ? { ...s, status, ...extra } : s));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status, ...extra as Partial<Seller> } : s);
      showToast(`Seller ${status}`);
    }
    setUpdating(null);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const submitReject = () => {
    if (!selected) return;
    updateStatus(selected.id, 'rejected', { rejection_reason: rejectReason });
    setShowRejectModal(false);
  };

  const getDocPath = (url: string | null) => {
    if (!url) return '';
    const m = url.match(/seller-documents\/(.+)/);
    return m ? m[1] : '';
  };

  const filtered = sellers.filter((s) => {
    const matchFilter = filter === 'all' || s.status === filter;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      || s.shop_name.toLowerCase().includes(search.toLowerCase())
      || s.phone.includes(search);
    return matchFilter && matchSearch;
  });

  const counts = sellers.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, shop, or phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all','pending','approved','rejected','blocked'] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}>
              {s} {s !== 'all' && counts[s] ? `(${counts[s]})` : s === 'all' ? `(${sellers.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No sellers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Seller / Shop</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{s.shop_name}</p>
                      <p className="text-xs text-gray-400">{s.name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setSelected(s)} title="View details"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                          <Eye size={14} />
                        </button>
                        {s.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(s.id, 'approved')} disabled={updating === s.id} title="Approve"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50">
                              {updating === s.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                            </button>
                            <button onClick={() => { setSelected(s); setShowRejectModal(true); }} disabled={updating === s.id} title="Reject"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <button onClick={() => updateStatus(s.id, 'blocked')} disabled={updating === s.id} title="Block"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors disabled:opacity-50">
                            <Ban size={14} />
                          </button>
                        )}
                        {s.status === 'blocked' && (
                          <button onClick={() => updateStatus(s.id, 'approved')} disabled={updating === s.id} title="Unblock"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50">
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {s.status === 'rejected' && (
                          <button onClick={() => updateStatus(s.id, 'pending')} disabled={updating === s.id} title="Re-open review"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50">
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{selected.shop_name}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: User, label: 'Full Name', value: selected.name },
                  { icon: Phone, label: 'Phone', value: selected.phone },
                  { icon: MapPin, label: 'Personal Address', value: selected.address },
                  { icon: Store, label: 'Shop Name', value: selected.shop_name },
                  { icon: MapPin, label: 'Shop Address', value: selected.shop_address },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className={`bg-gray-50 rounded-xl p-3 ${label === 'Personal Address' || label === 'Shop Address' ? 'col-span-2' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={13} className="text-blue-500" />
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              {selected.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-500 font-semibold mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selected.rejection_reason}</p>
                </div>
              )}

              <div>
                <p className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={15} className="text-blue-500" /> Verification Documents
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'NID Front', url: selected.nid_front_url },
                    { label: 'NID Back',  url: selected.nid_back_url },
                    { label: 'Trade License', url: selected.trade_license_url },
                  ].map(({ label, url }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">{label}</p>
                      <SignedImg storagePath={getDocPath(url)} alt={label} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              {selected.status === 'pending' && (
                <>
                  <button onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-sm rounded-xl transition-colors">
                    <XCircle size={15} /> Reject
                  </button>
                  <button onClick={() => { updateStatus(selected.id, 'approved'); setSelected(null); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition-colors">
                    <CheckCircle size={15} /> Approve
                  </button>
                </>
              )}
              {selected.status === 'approved' && (
                <button onClick={() => { updateStatus(selected.id, 'blocked'); setSelected(null); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors">
                  <Ban size={15} /> Block Seller
                </button>
              )}
              {selected.status === 'blocked' && (
                <button onClick={() => { updateStatus(selected.id, 'approved'); setSelected(null); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition-colors">
                  <RotateCcw size={15} /> Unblock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Reject Seller</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason for rejecting <strong>{selected.shop_name}</strong>.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              rows={4} placeholder="e.g. NID photo unclear, trade license expired, mismatched information..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={submitReject} disabled={!rejectReason.trim() || updating === selected.id}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-200 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                {updating === selected.id ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400" /> {toast}
        </div>
      )}
    </div>
  );
}
