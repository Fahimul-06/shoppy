import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><Shield className="text-orange-500"/> Privacy Policy</h1>
      <p className="text-gray-600 mb-8">This page explains how Shoppy handles customer, seller, delivery, and admin information.</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 text-gray-700 leading-relaxed">
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Information we collect</h2><p>We may collect account information, contact details, delivery address, order details, payment method, support messages, and activity needed to run the marketplace.</p></section>
        <section><h2 className="font-black text-lg text-gray-900 mb-2">How we use information</h2><p>We use information to process orders, provide delivery, manage returns/refunds, prevent fraud, improve service, and provide customer care.</p></section>
        <section><h2 className="font-black text-lg text-gray-900 mb-2">Data protection</h2><p>We use access control and account authentication to protect admin, seller, delivery, and customer data.</p></section>
      </div>
    </div>
  );
}
