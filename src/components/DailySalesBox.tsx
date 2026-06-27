import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Tag } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';

function getDiscountPercent(price: number, originalPrice?: number, discount?: number) {
  if (discount && discount > 0) return Math.round(discount);
  if (originalPrice && originalPrice > price) {
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  return 0;
}

export default function DailySalesBox() {
  const { products, loading } = useProducts();
  const saleProducts = products
    .filter((product) => Array.isArray(product.saleTags) && product.saleTags.includes('daily'))
    .slice(0, 10);

  const displayProducts = saleProducts.length > 0 ? saleProducts : products.slice(0, 10);

  return (
    <section className="bg-gray-50 pt-4 pb-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-red-50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Flame size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Daily Sales</h2>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Products selected by admin for today</p>
              </div>
            </div>
            <Link to="/daily-sale" className="text-sm font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading daily sales...</div>
          ) : displayProducts.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No daily sale products selected yet.</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 sm:px-5 py-4 scrollbar-thin">
              {displayProducts.map((product) => {
                const discount = getDiscountPercent(product.price, product.originalPrice, product.discount);
                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group w-36 sm:w-44 shrink-0 rounded-xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=400&q=80'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-red-500 text-white text-[11px] font-bold px-2 py-1">
                          <Tag size={11} /> {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-orange-600 font-bold">৳{product.price.toLocaleString()}</span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs text-gray-400 line-through">৳{product.originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
