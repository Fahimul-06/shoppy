import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

const badgeStyles: Record<string, string> = {
  sale: 'bg-red-500 text-white',
  hot: 'bg-orange-500 text-white',
  new: 'bg-green-500 text-white',
};

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart();

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all duration-200 group flex flex-col">
      <Link to={`/product/${product.id}`} className="relative overflow-hidden bg-gray-50 block" style={{ paddingTop: '75%' }}>
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.badge && (
          <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-lg uppercase ${badgeStyles[product.badge]}`}>
            {product.badge}
          </span>
        )}
        {product.discount && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
            -{product.discount}%
          </span>
        )}
        <button
          onClick={(e) => e.preventDefault()}
          className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
        >
          <Heart size={15} />
        </button>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="flex-1">
          <h3 className="text-sm text-gray-800 font-medium line-clamp-2 mb-2 leading-snug hover:text-orange-500 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < Math.floor(product.rating ?? 0) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">({Number(product.reviewCount ?? 0).toLocaleString()})</span>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-base font-bold text-gray-900">৳{Number(product.price ?? 0).toLocaleString()}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">৳{Number(product.originalPrice).toLocaleString()}</span>
          )}
        </div>

        <button
          onClick={() => addItem(product)}
          className="w-full bg-orange-50 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-200 hover:border-orange-500 text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
        >
          <ShoppingCart size={15} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
