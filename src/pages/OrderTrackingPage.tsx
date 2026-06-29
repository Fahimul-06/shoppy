import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Search } from 'lucide-react';

export default function OrderTrackingPage() {
  const [query, setQuery] = useState('');
  const ordersUrl = useMemo(() => query.trim() ? `/orders?track=${encodeURIComponent(query.trim())}` : '/orders', [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-gray-100 p-8">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><PackageSearch className="text-orange-500"/> Order Tracking</h1>
        <p className="text-gray-600 mb-6">Enter your order number or barcode ID, then open your order page to check the latest status.</p>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order number or barcode ID" className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-200" />
          </div>
          <Link to={ordersUrl} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 text-center">Track Order</Link>
        </div>
        <p className="text-sm text-gray-500">You may need to login to your customer account to see your order details.</p>
      </div>
    </div>
  );
}
