import React from 'react';
import { Cookie } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><Cookie className="text-orange-500"/> Cookie Policy</h1>
      <p className="text-gray-600 mb-8">Shoppy may use browser storage and cookies to improve shopping, login, cart, promo, and support experiences.</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 text-gray-700 leading-relaxed">
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Why cookies are used</h2><p>Cookies and local storage can help keep carts, collected vouchers, login sessions, and customer preferences available while using the website.</p></section>
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Managing cookies</h2><p>You can clear browser cookies or site data from your browser settings. Some features may not work correctly after clearing them.</p></section>
      </div>
    </div>
  );
}
