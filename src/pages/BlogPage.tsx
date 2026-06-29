import React from 'react';
import { BookOpen, ShoppingBag, Truck, BadgePercent } from 'lucide-react';

const posts = [
  { title: 'How to shop safely online', icon: ShoppingBag, text: 'Tips for choosing products, checking prices, and placing secure orders.' },
  { title: 'How delivery tracking works', icon: Truck, text: 'Understand order status, shipped orders, delivery assignment, and final delivery.' },
  { title: 'How to use promos and vouchers', icon: BadgePercent, text: 'Learn how to collect vouchers, apply promo codes, and save more.' },
];

export default function BlogPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><BookOpen className="text-orange-500"/> Blog</h1>
      <p className="text-gray-600 mb-8">Latest shopping tips, platform updates, seller guides, and delivery information.</p>
      <div className="grid md:grid-cols-3 gap-5">
        {posts.map(({ title, text, icon: Icon }) => (
          <article key={title} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4"><Icon /></div>
            <h2 className="font-black text-lg mb-2">{title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
