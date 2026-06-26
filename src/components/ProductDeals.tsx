import React from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductCard from './ProductCard';

export default function ProductDeals() {
  return (
    <section className="py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-900">Deals You Can't Miss</h2>
            <span className="hidden sm:inline-flex items-center bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
              Limited Time
            </span>
          </div>
          <Link to="/category/all" className="text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
