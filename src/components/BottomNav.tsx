import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';

const navItems = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Grid3X3, label: 'Categories', to: '/category/all' },
  { icon: ShoppingCart, label: 'Cart', to: '/cart' },
  { icon: User, label: 'Account', to: '/account' },
];

export default function BottomNav() {
  const { totalItems } = useCart();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden">
      <div className="flex items-center">
        {navItems.map((item) => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors relative ${active ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'}`}
            >
              <div className="relative">
                <item.icon size={22} />
                {item.to === '/cart' && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 leading-none text-[10px]">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
