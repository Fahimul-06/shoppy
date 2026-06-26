import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const results = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand?.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
          <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">Search Results</span>
        </nav>

        <div className="flex items-center gap-3 mb-6">
          <Search size={20} className="text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900">
            {query ? (
              <>Results for "<span className="text-orange-500">{query}</span>"</>
            ) : (
              'All Products'
            )}
          </h1>
          <span className="text-sm text-gray-500">({results.length} found)</span>
        </div>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Search size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-700 font-semibold text-lg mb-1">No results found</p>
            <p className="text-gray-400 text-sm mb-6">
              We couldn't find anything matching "<span className="font-medium">{query}</span>"
            </p>
            <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm">
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
