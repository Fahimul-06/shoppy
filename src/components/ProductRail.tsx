import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Product } from '../types';
import ProductCard from './ProductCard';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink?: string;
  emptyText?: string;
}

export default function ProductRail({ title, subtitle, products, viewAllLink, emptyText = 'No products available yet.' }: ProductRailProps) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 whitespace-nowrap">
            View all <ChevronRight size={15} />
          </Link>
        )}
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </section>
  );
}
