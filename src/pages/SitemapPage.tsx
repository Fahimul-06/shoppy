import React from 'react';
import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { SELLER_REGISTER_PATH } from '../lib/adminPortal';

const links = [
  ['Home', '/'], ['Search', '/search'], ['New Arrivals', '/new-arrivals'], ['Daily Sale', '/daily-sale'], ['Flash Sale', '/flash-sale'],
  ['Cart', '/cart'], ['Orders', '/orders'], ['Wishlist', '/wishlist'], ['Coupons', '/coupons'], ['Help Center', '/help-center'],
  ['How to Buy', '/how-to-buy'], ['Returns & Refunds', '/returns-refunds'], ['Contact Us', '/contact-us'], ['Order Tracking', '/order-tracking'],
  ['About Shoppy', '/about-shoppy'], ['Careers', '/careers'], ['Sell on Shoppy', SELLER_REGISTER_PATH], ['Blog', '/blog'], ['Press Room', '/press-room'],
  ['Privacy Policy', '/privacy-policy'], ['Terms & Conditions', '/terms-conditions'], ['Cookie Policy', '/cookie-policy'],
];

export default function SitemapPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><Map className="text-orange-500"/> Sitemap</h1>
      <p className="text-gray-600 mb-8">Find all important Shoppy customer pages from one place.</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map(([label, to]) => (
          <Link key={to} to={to} className="rounded-xl border border-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors">{label}</Link>
        ))}
      </div>
    </div>
  );
}
