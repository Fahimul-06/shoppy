import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import ImageUploader from '../../components/forms/ImageUploader';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  placement?: 'hero' | 'header';
  sortOrder?: number;
  active?: boolean;
};

const emptyForm = {
  image: '',
  title: '',
  subtitle: '',
  link: '',
  placement: 'hero' as 'hero' | 'header',
  sortOrder: '0',
  active: true,
};

export default function AdminBannersTab() {
  const token = getToken('admin');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get<{ banners: Banner[] }>('/admin/banners', token);
    setBanners(res.banners || []);
  };

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load banners')); }, []);

  const save = async () => {
    setLoading(true); setError(''); setMsg('');
    try {
      await api.post('/admin/banners', { ...form, sortOrder: Number(form.sortOrder || 0) }, token);
      setForm(emptyForm);
      setMsg('Display photo saved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save display photo');
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this display photo?')) return;
    await api.delete(`/admin/banners/${id}`, token);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-xl font-black flex items-center gap-2"><ImageIcon /> Hero & Header Display Photos</h2>
        <p className="text-sm text-gray-500 mt-1">Upload photos for the homepage hero box and the upper header display box.</p>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {msg && <p className="mt-3 text-sm font-semibold text-green-600">{msg}</p>}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Display location</span>
            <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as 'hero' | 'header' })}>
              <option value="hero">Homepage hero photo box</option>
              <option value="header">Header upper display box</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Sort order</span>
            <input className="mt-1 w-full border rounded-xl p-3 text-sm" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
          <input className="border rounded-xl p-3 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm" placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <input className="border rounded-xl p-3 text-sm md:col-span-2" placeholder="Optional link, example: /daily-sale" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <ImageUploader label="Display photo" helperText="Upload hero/header display photo" value={form.image} onChange={(url) => setForm({ ...form, image: url })} token={token} />
        </div>
        <button onClick={save} disabled={loading} className="mt-4 bg-blue-600 disabled:bg-blue-300 text-white rounded-xl px-5 py-2.5 font-bold flex items-center gap-2"><Plus size={16}/>{loading ? 'Saving...' : 'Add display photo'}</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-2xl border overflow-hidden">
            <img src={banner.image} alt={banner.title || 'Display'} className="w-full h-40 object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase font-black text-orange-600">{banner.placement === 'header' ? 'Header upper display' : 'Hero photo box'}</p>
                  <h3 className="font-black text-gray-900">{banner.title || 'Untitled display photo'}</h3>
                  <p className="text-sm text-gray-500">{banner.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{banner.active === false ? 'Inactive' : 'Active'} • Sort {banner.sortOrder || 0}</p>
                </div>
                <button onClick={() => remove(banner.id)} className="text-red-500 hover:text-red-600"><Trash2 size={17}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
