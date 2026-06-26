import React from 'react';
import { Tag, ShieldCheck, CreditCard, Truck } from 'lucide-react';

const features = [
  {
    icon: Tag,
    title: 'Competitive Price',
    desc: 'Get The Best Prices Everyday',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    icon: ShieldCheck,
    title: 'Authentic Products',
    desc: 'Secured with Brand Warranty',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: CreditCard,
    title: 'Easy & Secured Payment',
    desc: 'Pre-payment, Cash on Delivery',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'Rapid delivery At Your Doorstep',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

export default function FeatureBadges() {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className={`${f.bg} ${f.color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <f.icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm leading-tight">{f.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
