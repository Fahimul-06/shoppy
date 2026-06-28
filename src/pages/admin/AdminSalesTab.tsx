import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, ShoppingBag, Sparkles, Zap, Save, Clock, Receipt } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { defaultPlatformSettings, normalizePlatformSettings, type PlatformSettings } from '../../lib/platformSettings';

type SaleType = 'daily' | 'flash' | 'newArrival';
type Product = {
  id: string;
  _id?: string;
  name: string;
  image?: string;
  price?: number;
  originalPrice?: number;
  brand?: string;
  category?: string;
  subcategory?: string;
  childCategory?: string;
  stock?: number;
  active?: boolean;
  saleTags?: string[];
  dailySaleDiscount?: number;
  flashSaleDiscount?: number;
  newArrival?: boolean;
  badge?: string;
};

const saleConfig = {
  daily: {
    label: 'Daily Sale',
    short: 'Daily',
    icon: ShoppingBag,
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    active: 'bg-orange-600 text-white border-orange-600',
    needsDiscount: true,
  },
  flash: {
    label: 'Flash Sale',
    short: 'Flash',
    icon: Zap,
    border: 'border-red-200',
    bg: 'bg-red-50',
    active: 'bg-red-600 text-white border-red-600',
    needsDiscount: true,
  },
  newArrival: {
    label: 'New Arrivals',
    short: 'New',
    icon: Sparkles,
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    active: 'bg-emerald-600 text-white border-emerald-600',
    needsDiscount: false,
  },
} as const;

export default function AdminSalesTab() {
  const [saleType, setSaleType] = useState<SaleType>('daily');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [discount, setDiscount] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<PlatformSettings>(defaultPlatformSettings);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const toDatetimeLocal = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const fromDatetimeLocal = (value: string) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const [productResponse, settingsResponse] = await Promise.all([
      api.get<{ products: Product[] }>('/admin/products', getToken('admin')),
      api.get<{ settings: PlatformSettings }>('/admin/platform-settings', getToken('admin')),
    ]);
    setProducts(productResponse.products || []);
    setSettings(normalizePlatformSettings(settingsResponse.settings));
    setLoading(false);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const response = await api.put<{ settings: PlatformSettings }>('/admin/platform-settings', {
        ...settings,
        flashSaleStartsAt: settings.flashSaleStartsAt || null,
        flashSaleEndsAt: settings.flashSaleEndsAt || null,
      }, getToken('admin'));
      setSettings(normalizePlatformSettings(response.settings));
      setSettingsMessage('Flash sale time and checkout charges saved.');
    } catch (e) {
      setSettingsMessage(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    load().catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load products');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const current = saleType === 'newArrival'
      ? products.filter((p) => p.newArrival || p.badge === 'new')
      : products.filter((p) => Array.isArray(p.saleTags) && p.saleTags.includes(saleType));
    setSelected(current.map((p) => p.id || p._id || '').filter(Boolean));
    setDiscount(saleType === 'daily' ? String(current[0]?.dailySaleDiscount || '') : saleType === 'flash' ? String(current[0]?.flashSaleDiscount || '') : '');
    setMessage('');
    setError('');
  }, [saleType, products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.name, p.brand, p.category, p.subcategory, p.childCategory]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q));
  }, [products, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedProducts = useMemo(() => products.filter((p) => selectedSet.has(p.id || p._id || '')), [products, selectedSet]);

  const toggleProduct = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const selectVisible = () => {
    const ids = filteredProducts.map((p) => p.id || p._id || '').filter(Boolean);
    setSelected((current) => Array.from(new Set([...current, ...ids])));
  };

  const clearVisible = () => {
    const ids = new Set(filteredProducts.map((p) => p.id || p._id || '').filter(Boolean));
    setSelected((current) => current.filter((id) => !ids.has(id)));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.postWithTimeout('/admin/sales/apply', {
        saleType,
        discount: saleConfig[saleType].needsDiscount ? Number(discount || 0) : 0,
        productIds: selected,
        replaceExisting: true,
      }, getToken('admin'), 120000);
      setMessage(`${saleConfig[saleType].label} updated for ${selected.length} product(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sale update failed');
    } finally {
      setSaving(false);
    }
  };

  const CurrentIcon = saleConfig[saleType].icon;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">Sale & New Arrival Manager</h2>
            <p className="text-sm text-gray-500 mt-1">Choose Daily Sale, Flash Sale, or New Arrivals. Select many products together, then submit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[260px]">
            {(['daily', 'flash', 'newArrival'] as SaleType[]).map((type) => {
              const Icon = saleConfig[type].icon;
              return (
                <button
                  key={type}
                  onClick={() => setSaleType(type)}
                  className={`border rounded-2xl p-4 font-black flex items-center justify-center gap-2 ${saleType === type ? saleConfig[type].active : `${saleConfig[type].bg} ${saleConfig[type].border} text-gray-700`}`}
                >
                  <Icon size={18} /> {saleConfig[type].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>


      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-red-500" /><h3 className="font-black text-gray-900">Flash Sale Time</h3></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600">Start time</label>
              <input type="datetime-local" className="mt-1 w-full border rounded-xl p-3 text-sm" value={toDatetimeLocal(settings.flashSaleStartsAt)} onChange={(e)=>setSettings({...settings, flashSaleStartsAt: fromDatetimeLocal(e.target.value)})}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">End time</label>
              <input type="datetime-local" className="mt-1 w-full border rounded-xl p-3 text-sm" value={toDatetimeLocal(settings.flashSaleEndsAt)} onChange={(e)=>setSettings({...settings, flashSaleEndsAt: fromDatetimeLocal(e.target.value)})}/>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Customer Flash Sale page countdown uses this end time.</p>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center gap-2 mb-4"><Receipt size={18} className="text-blue-500" /><h3 className="font-black text-gray-900">Checkout Charges</h3></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600">Delivery charge</label>
              <input type="number" min="0" className="mt-1 w-full border rounded-xl p-3 text-sm" value={settings.deliveryCharge} onChange={(e)=>setSettings({...settings, deliveryCharge: Number(e.target.value || 0)})}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Free delivery minimum</label>
              <input type="number" min="0" className="mt-1 w-full border rounded-xl p-3 text-sm" value={settings.freeDeliveryMin} onChange={(e)=>setSettings({...settings, freeDeliveryMin: Number(e.target.value || 0)})}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Platform fee type</label>
              <select className="mt-1 w-full border rounded-xl p-3 text-sm" value={settings.platformFeeType} onChange={(e)=>setSettings({...settings, platformFeeType: e.target.value === 'percent' ? 'percent' : 'fixed'})}>
                <option value="fixed">Fixed amount</option>
                <option value="percent">Percentage</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Platform fee {settings.platformFeeType === 'percent' ? '%' : '৳'}</label>
              <input type="number" min="0" className="mt-1 w-full border rounded-xl p-3 text-sm" value={settings.platformFee} onChange={(e)=>setSettings({...settings, platformFee: Number(e.target.value || 0)})}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">VAT %</label>
              <input type="number" min="0" max="100" className="mt-1 w-full border rounded-xl p-3 text-sm" value={settings.vatPercent} onChange={(e)=>setSettings({...settings, vatPercent: Number(e.target.value || 0)})}/>
            </div>
            <div className="flex items-end">
              <button onClick={saveSettings} disabled={settingsSaving} className="w-full bg-slate-900 disabled:bg-slate-400 text-white rounded-xl py-3 font-black flex items-center justify-center gap-2">{settingsSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Charges</button>
            </div>
          </div>
          {settingsMessage && <p className={`text-xs mt-3 ${settingsMessage.includes('saved') ? 'text-green-700' : 'text-red-600'}`}>{settingsMessage}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className={`p-5 border-b ${saleConfig[saleType].bg}`}>
            <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-black text-gray-900"><CurrentIcon size={20} /> Manage {saleConfig[saleType].label}</div>
                <p className="text-sm text-gray-600 mt-1">Current selected products will replace the existing {saleConfig[saleType].label.toLowerCase()} list.</p>
              </div>
              {saleConfig[saleType].needsDiscount ? (
                <div className="w-full md:w-56">
                  <label className="text-xs font-bold text-gray-600">Discount percentage</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1 w-full border rounded-xl p-3 text-sm font-bold"
                    placeholder="Example: 15"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-white/80 border px-4 py-3 text-sm text-gray-600 font-semibold">
                  New Arrivals does not need discount.
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-b flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full border rounded-xl pl-9 pr-3 py-3 text-sm"
                placeholder="Search product name, brand, category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={selectVisible} className="px-4 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm">Select visible</button>
              <button onClick={clearVisible} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm">Clear visible</button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto divide-y">
              {filteredProducts.map((product) => {
                const id = product.id || product._id || '';
                const isSelected = selectedSet.has(id);
                return (
                  <label key={id} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" className="w-5 h-5" checked={isSelected} onChange={() => toggleProduct(id)} />
                    <img src={product.image || '/placeholder.png'} className="w-14 h-14 rounded-xl object-cover bg-gray-100" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 truncate">{[product.brand, product.category, product.subcategory, product.childCategory].filter(Boolean).join(' • ') || 'No category'}</p>
                      <p className="text-xs text-gray-500">Stock: {product.stock ?? 0} · ৳{Number(product.price || 0).toLocaleString()}</p>
                    </div>
                    <div className="hidden sm:block text-right text-[11px] font-bold text-orange-600">
                      {Array.isArray(product.saleTags) && product.saleTags.length > 0 && product.saleTags.map((tag) => tag === 'daily' ? `Daily ${product.dailySaleDiscount || 0}%` : `Flash ${product.flashSaleDiscount || 0}%`).join(' + ')}
                      {(product.newArrival || product.badge === 'new') && <div className="text-emerald-600">New Arrival</div>}
                    </div>
                  </label>
                );
              })}
              {!filteredProducts.length && <div className="p-10 text-center text-gray-500 text-sm">No products found.</div>}
            </div>
          )}
        </div>

        <aside className="bg-white rounded-2xl border p-5 h-fit sticky top-4">
          <h3 className="font-black text-gray-900 mb-2">Selected Products</h3>
          <p className="text-sm text-gray-500 mb-4">{selectedProducts.length} product(s) selected for {saleConfig[saleType].label}.</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {selectedProducts.map((p) => (
              <div key={p.id || p._id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                <img src={p.image || '/placeholder.png'} className="w-9 h-9 rounded-lg object-cover" />
                <div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{p.name}</p><p className="text-[11px] text-gray-500">৳{Number(p.price || 0).toLocaleString()}</p></div>
                <button onClick={() => toggleProduct(p.id || p._id || '')} className="text-red-500 text-xs font-bold">Remove</button>
              </div>
            ))}
            {!selectedProducts.length && <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">No products selected yet.</p>}
          </div>
          {message && <p className="mt-4 text-sm text-green-700 bg-green-50 p-3 rounded-xl">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
          <button onClick={save} disabled={saving} className="mt-4 w-full bg-blue-600 disabled:bg-blue-300 text-white rounded-xl py-3 font-black flex justify-center items-center gap-2">
            {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Submit {saleConfig[saleType].label}
          </button>
        </aside>
      </div>
    </div>
  );
}
