import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, CreditCard, Truck } from 'lucide-react';

const steps = [
  { title: 'Search or browse products', desc: 'Use search, categories, daily sale, flash sale, or new arrivals to find products.', icon: Search },
  { title: 'Add to cart', desc: 'Open the product page, choose quantity, then add the product to your cart.', icon: ShoppingCart },
  { title: 'Place order', desc: 'Go to checkout, enter delivery information, and select payment method.', icon: CreditCard },
  { title: 'Receive delivery', desc: 'Track your order and receive your products from the assigned delivery person.', icon: Truck },
];

export default function HowToBuyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">How to Buy</h1>
      <p className="text-gray-600 mb-8">Follow these simple steps to place an order on Shoppy.</p>
      <div className="grid md:grid-cols-2 gap-5">
        {steps.map(({ title, desc, icon: Icon }, index) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center"><Icon /></div>
              <div>
                <p className="text-xs font-black text-orange-500">STEP {index + 1}</p>
                <h2 className="font-black text-lg">{title}</h2>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <Link to="/" className="inline-flex mt-8 bg-orange-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-orange-600">Start Shopping</Link>
    </div>
  );
}
