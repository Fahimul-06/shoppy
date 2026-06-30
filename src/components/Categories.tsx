import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { categories } from '../data/categories';

export default function Categories() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  return (
    <section className="bg-white py-6 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Categories</h2>
          <Link to="/category/all" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
            View All
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:shadow-lg transition-shadow border border-gray-100 hidden sm:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
                style={{ minWidth: '80px' }}
              >
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-gray-100 border-2 border-transparent group-hover:border-orange-400 transition-all duration-200 group-hover:shadow-md">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-xs text-center text-gray-600 group-hover:text-orange-500 font-medium leading-tight transition-colors" style={{ maxWidth: '72px' }}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:shadow-lg transition-shadow border border-gray-100 hidden sm:flex"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </section>
  );
}
