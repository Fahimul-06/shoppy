import React from 'react';
import { FileText } from 'lucide-react';

export default function TermsConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><FileText className="text-orange-500"/> Terms & Conditions</h1>
      <p className="text-gray-600 mb-8">Please read these terms before using Shoppy.</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 text-gray-700 leading-relaxed">
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Orders</h2><p>Customers must provide accurate delivery information. Order acceptance depends on product availability and seller/admin confirmation.</p></section>
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Payments</h2><p>Online payment orders may be marked paid after payment confirmation. Cash on delivery orders are marked paid after successful delivery.</p></section>
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Returns and refunds</h2><p>Return and refund eligibility depends on product condition, policy rules, and admin approval.</p></section>
      </div>
    </div>
  );
}
