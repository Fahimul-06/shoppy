import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

export default function ReturnsRefundsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-gray-100 p-8">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><RotateCcw className="text-orange-500"/> Returns & Refunds</h1>
        <p className="text-gray-600 mb-6">You can request product returns from your account/order section according to the seller and platform policy.</p>
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="rounded-2xl bg-green-50 border border-green-100 p-5">
            <h2 className="font-black mb-2 flex items-center gap-2 text-green-700"><CheckCircle size={20}/> Return allowed when</h2>
            <ul className="text-sm text-green-800 space-y-2 list-disc ml-5">
              <li>Wrong product was delivered.</li>
              <li>Product arrived damaged or defective.</li>
              <li>Product is incomplete or missing parts.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-orange-50 border border-orange-100 p-5">
            <h2 className="font-black mb-2 flex items-center gap-2 text-orange-700"><AlertCircle size={20}/> Before requesting</h2>
            <ul className="text-sm text-orange-800 space-y-2 list-disc ml-5">
              <li>Keep the product package and order information.</li>
              <li>Submit the request from your account order page.</li>
              <li>Customer care may contact you for confirmation.</li>
            </ul>
          </div>
        </div>
        <Link to="/returns" className="inline-flex bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800">Request / Manage Returns</Link>
      </div>
    </div>
  );
}
