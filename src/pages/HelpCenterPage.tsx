import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, MessageCircle, PackageSearch, RotateCcw, ShoppingBag, Phone } from 'lucide-react';

const helpCards = [
  { title: 'How to Buy', desc: 'Learn how to search products, add to cart, and place orders.', to: '/how-to-buy', icon: ShoppingBag },
  { title: 'Track Order', desc: 'Check your order status and delivery progress.', to: '/order-tracking', icon: PackageSearch },
  { title: 'Returns & Refunds', desc: 'Request returns, refunds, and replacement support.', to: '/returns-refunds', icon: RotateCcw },
  { title: 'Contact Us', desc: 'Chat with customer care or see contact information.', to: '/contact-us', icon: Phone },
];

export default function HelpCenterPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-3">
          <HelpCircle size={34} />
          <h1 className="text-3xl font-black">Help Center</h1>
        </div>
        <p className="text-orange-50 max-w-2xl">Find help for shopping, payment, delivery, returns, refunds, and customer-care support.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {helpCards.map(({ title, desc, to, icon: Icon }) => (
          <Link key={title} to={to} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-shadow">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <Icon size={22} />
            </div>
            <h2 className="font-black text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-xl mb-3 flex items-center gap-2"><MessageCircle className="text-orange-500"/> Need quick support?</h2>
        <p className="text-gray-600 mb-4">Use the floating Customer Care button to chat with support, or open the contact page for more details.</p>
        <Link to="/contact-us" className="inline-flex bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800">Contact Customer Care</Link>
      </div>
    </div>
  );
}
