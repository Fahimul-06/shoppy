import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube, ShoppingCart } from 'lucide-react';

const customerCare = [
  { label: 'Help Center', to: '/help-center' },
  { label: 'How to Buy', to: '/how-to-buy' },
  { label: 'Returns & Refunds', to: '/returns-refunds' },
  { label: 'Contact Us', to: '/contact-us' },
  { label: 'Order Tracking', to: '/order-tracking' },
];
const aboutLinks = [
  { label: 'About Shoppy', to: '/about-shoppy' },
  { label: 'Careers', to: '/careers' },
  { label: 'Sell on Shoppy', to: '/seller/register' },
  { label: 'Blog', to: '/blog' },
  { label: 'Press Room', to: '/press-room' },
];

const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms-conditions' },
  { label: 'Cookie Policy', to: '/cookie-policy' },
  { label: 'Sitemap', to: '/sitemap' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* App download banner */}
      <div className="bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-bold text-lg">Download the Shoppy App</h3>
            <p className="text-orange-100 text-sm">Get exclusive app-only deals and faster checkout</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </button>
            <button className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
              </svg>
              Google Play
            </button>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-xl">Shoppy</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              Bangladesh's leading online shopping destination. Shop from thousands of products across all categories.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <span>Rahman Regnum Centre, Level-6, 191/1, Tejgaon C/A, Dhaka-1208, Bangladesh</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-orange-400 flex-shrink-0" />
                <span>9 am - 9 pm (Everyday)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-orange-400 flex-shrink-0" />
                <span>support@shoppy.com</span>
              </div>
            </div>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="text-white font-bold mb-4">Customer Care</h4>
            <ul className="space-y-2.5">
              {customerCare.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm hover:text-orange-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-white font-bold mb-4">About Shoppy</h4>
            <ul className="space-y-2.5">
              {aboutLinks.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm hover:text-orange-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment & Social */}
          <div>
            <h4 className="text-white font-bold mb-4">Payment Methods</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {['VISA', 'bKash', 'Nagad', 'COD', 'AMEX', 'UPAY'].map((method) => (
                <span key={method} className="bg-white text-gray-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-gray-200">
                  {method}
                </span>
              ))}
            </div>
            <h4 className="text-white font-bold mb-3">Follow Us</h4>
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© 2024 Shoppy. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <Link key={link.label} to={link.to} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
