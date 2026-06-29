import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Truck, Users } from 'lucide-react';

export default function AboutShoppyPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingCart size={34} />
          <h1 className="text-3xl font-black">About Shoppy</h1>
        </div>
        <p className="text-orange-50 max-w-3xl">Shoppy is an online shopping platform built for customers, sellers, delivery teams, and admins to manage products, orders, payments, promos, and support in one place.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[{ icon: ShieldCheck, title: 'Trusted shopping', text: 'Secure checkout, order tracking, support, returns, and refund workflows.' }, { icon: Truck, title: 'Fast delivery', text: 'Order assignment, delivery dashboard, and status updates for delivery teams.' }, { icon: Users, title: 'Seller friendly', text: 'Seller registration, product management, shop pages, and order handling.' }].map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4"><Icon /></div>
            <h2 className="font-black text-lg mb-2">{title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-xl mb-3">Our goal</h2>
        <p className="text-gray-600 leading-relaxed mb-4">Our goal is to make online buying and selling simple, reliable, and easy to manage from Bangladesh.</p>
        <Link to="/contact-us" className="inline-flex bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800">Contact Shoppy</Link>
      </div>
    </div>
  );
}
