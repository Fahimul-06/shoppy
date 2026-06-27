import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, Tags } from 'lucide-react';
import { api, getToken } from '../../lib/api';
import { categories } from '../../data/categories';

type Product = any;
type SaleType = 'daily' | 'flash';

const saleLabel = (type: SaleType) => (type === 'daily' ? 'Daily Sale' : 'Flash Sale');
const categoryLabel = (slug?: string) => categories.find((c) => c.slug === slug)?.name || slug || 'Uncategorized';

export default function AdminSalesTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>('daily');
  const [discount, setDiscount] = useState('10');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get<{ products: Product[] }>('/admin/products', getToken('admin'));
      setProducts(r.products || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [
      p.name,
      p.brand,
      p.category,
      p.subcategory,
      p.childCategory,
      p.seller?.shopName,
      p.seller?.name,
    ].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [products, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleIds = filteredProducts.map((p) => p.id).filter(Boolean);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  const toggleProduct = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const toggleVisible = () => {
    setSelectedIds((current) => {
      const currentSet = new Set(current);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => currentSet.delete(id));
      } else {
        visibleIds.forEach((id) => currentSet.add(id));
      }
      return Array.from(currentSet);
    });
  };

  const applySale = async () => {
    setMessage('');
    setError('');
    const numericDiscount = Number(discount);
    if (!selectedIds.length) { setError('Please select at least one product.'); return; }
    if (!Number.isFinite(numericDiscount) || numericDiscount < 0 || numericDiscount > 100) { setError('Discount must be between 0 and 100.'); return; }

    try {
      setSaving(true);
      const r = await api.patch<{ message: string; updatedCount: number }>('/admin/products/sale-bulk', {
        saleType,
        discount: numericDiscount,
        productIds: selectedIds,
      }, getToken('admin'));
      setMessage(r.message || `${saleLabel(saleType)} updated for ${r.updatedCount || selectedIds.length} product(s).`);
      setSelectedIds([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update sale products');
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-5">
    <div className="grid lg:grid-cols-3 gap-4">
      <button onClick={() => setSaleType('daily')} className={`rounded-2xl border p-5 text-left ${saleType === 'daily' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-orange-50'}`}>
        <div className="flex items-center gap-3"><Tags size={22}/><h2 className="text-lg font-black">Daily Sale</h2></div>
        <p className={`text-sm mt-2 ${saleType === 'daily' ? 'text-orange-50' : 'text-gray-500'}`}>Select many products and apply one daily-sale discount.</p>
      </button>
      <button onClick={() => setSaleType('flash')} className={`rounded-2xl border p-5 text-left ${saleType === 'flash' ? 'bg-red-600 text-white border-red-600' : 'bg-white hover:bg-red-50'}`}>
        <div className="flex items-center gap-3"><Tags size={22}/><h2 className="text-lg font-black">Flash Sale</h2></div>
        <p className={`text-sm mt-2 ${saleType === 'flash' ? 'text-red-50' : 'text-gray-500'}`}>Select many products and apply one flash-sale discount.</p>
      </button>
      <div className="bg-white border rounded-2xl p-5">
        <label className="block text-sm font-black text-gray-700 mb-2">Discount percentage</label>
        <div className="flex gap-2">
          <input type="number" min="0" max="100" className="w-full border rounded-xl px-4 py-3 font-bold" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <span className="border rounded-xl px-4 py-3 font-black bg-gray-50">%</span>
        </div>
        <button onClick={applySale} disabled={saving || !selectedIds.length} className="mt-3 w-full bg-blue-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-black flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Apply to {selectedIds.length} product(s)
        </button>
      </div>
    </div>

    <div className="bg-white rounded-2xl border p-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
        <div>
          <h2 className="text-xl font-black">Select Products for {saleLabel(saleType)}</h2>
          <p className="text-sm text-gray-500">Use the big product dropdown/list below. Search by product, brand, category, seller, or shop.</p>
        </div>
        <div className="relative lg:w-96">
          <Search size={16} className="absolute left-3 top-3.5 text-gray-400"/>
          <input className="w-full border rounded-xl pl-10 pr-3 py-3 text-sm" placeholder="Search all products..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {message && <div className="mb-3 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm font-semibold">{message}</div>}
      {error && <div className="mb-3 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">{error}</div>}

      {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin"/></div> : <>
        <div className="flex items-center justify-between border rounded-xl px-4 py-3 mb-3 bg-gray-50">
          <label className="flex items-center gap-3 font-bold text-sm cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible}/>
            Select all visible products ({filteredProducts.length})
          </label>
          <span className="text-xs font-bold text-gray-500">Selected: {selectedIds.length}</span>
        </div>
        <div className="border rounded-2xl max-h-[520px] overflow-y-auto divide-y">
          {filteredProducts.length === 0 ? <div className="p-8 text-center text-gray-500">No products found.</div> : filteredProducts.map((p) => {
            const isSelected = selectedSet.has(p.id);
            const daily = Array.isArray(p.saleTags) && p.saleTags.includes('daily');
            const flash = Array.isArray(p.saleTags) && p.saleTags.includes('flash');
            return <label key={p.id} className={`flex gap-3 p-3 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
              <input type="checkbox" className="mt-6" checked={isSelected} onChange={() => toggleProduct(p.id)} />
              <img src={p.image || p.images?.[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1">
                  <h3 className="font-black text-gray-900 truncate">{p.name}</h3>
                  <p className="font-black text-blue-700">৳{Number(p.price || 0).toLocaleString()}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{categoryLabel(p.category)}{p.subcategory ? ` / ${p.subcategory}` : ''}{p.childCategory ? ` / ${p.childCategory}` : ''}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold">
                  {p.brand && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">Brand: {p.brand}</span>}
                  {p.seller?.shopName && <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700">Seller: {p.seller.shopName}</span>}
                  {daily && <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700">Daily Sale {p.dailySaleDiscount ? `-${p.dailySaleDiscount}%` : ''}</span>}
                  {flash && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">Flash Sale {p.flashSaleDiscount ? `-${p.flashSaleDiscount}%` : ''}</span>}
                </div>
              </div>
            </label>;
          })}
        </div>
      </>}
    </div>
  </div>;
}
