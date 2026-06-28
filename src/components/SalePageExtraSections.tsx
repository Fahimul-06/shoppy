import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Grid3X3, Sparkles, Star, Tags } from 'lucide-react';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import { categories } from '../data/categories';
import { getSalePrice, withSalePricing } from '../utils/salePricing';

const normalize = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryMatches = (product: Product, slug: string, name: string) => {
  const productCategory = normalize(product.category);
  return productCategory === normalize(slug) || productCategory === normalize(name);
};

const uniqueProducts = (rows: Product[]) => {
  const seen = new Set<string>();
  return rows.filter((product) => {
    const key = product.baseProductId || product.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function HorizontalProductSection({
  title,
  subtitle,
  icon,
  products,
  accent = 'orange',
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  products: Product[];
  accent?: 'orange' | 'red' | 'blue' | 'green';
}) {
  if (!products.length) return null;

  const accentClass = {
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  }[accent];

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${accentClass} rounded-2xl flex items-center justify-center text-white shadow-sm`}>
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {products.slice(0, 10).map((product) => (
          <ProductCard key={`${title}-${product.id}`} product={withSalePricing(product)} />
        ))}
      </div>
    </section>
  );
}

export default function SalePageExtraSections({ products }: { products: Product[] }) {
  const cleanProducts = uniqueProducts(products.filter((product) => product.active !== false));
  const newArrivals = cleanProducts
    .filter((product) => product.badge === 'new')
    .concat(cleanProducts.filter((product) => product.badge !== 'new').slice(-12).reverse())
    .slice(0, 10);

  const tk99Products = cleanProducts
    .filter((product) => getSalePrice(product) <= 99)
    .sort((a, b) => getSalePrice(a) - getSalePrice(b));

  const bestProducts = [...cleanProducts]
    .sort((a, b) => {
      const bScore = Number((b as any).soldCount || 0) * 10 + Number(b.reviewCount || 0) + Number(b.rating || 0) * 20;
      const aScore = Number((a as any).soldCount || 0) * 10 + Number(a.reviewCount || 0) + Number(a.rating || 0) * 20;
      return bScore - aScore;
    })
    .slice(0, 10);

  const categoryGroups = categories
    .map((category) => ({
      category,
      products: cleanProducts.filter((product) => categoryMatches(product, category.slug, category.name)).slice(0, 5),
    }))
    .filter((group) => group.products.length > 0)
    .slice(0, 6);

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <HorizontalProductSection
        title="New Arrivals"
        subtitle="Fresh products customers may like"
        icon={<Sparkles size={18} />}
        products={newArrivals}
        accent="green"
      />

      <HorizontalProductSection
        title="99tk Products"
        subtitle="Budget products priced at ৳99 or below"
        icon={<Tags size={18} />}
        products={tk99Products}
        accent="red"
      />

      <HorizontalProductSection
        title="Best Products"
        subtitle="Popular products by rating, reviews and sales"
        icon={<Star size={18} />}
        products={bestProducts}
        accent="orange"
      />

      {categoryGroups.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-sm">
              <Grid3X3 size={18} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Shop by Categories</h2>
              <p className="text-xs text-gray-500">Browse products category wise</p>
            </div>
          </div>
          <div className="space-y-8">
            {categoryGroups.map(({ category, products: categoryProducts }) => (
              <div key={category.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={category.image} alt={category.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                    <div>
                      <h3 className="font-black text-gray-900">{category.name}</h3>
                      <p className="text-xs text-gray-500">{categoryProducts.length} featured products</p>
                    </div>
                  </div>
                  <Link to={`/category/${category.slug}`} className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    View all <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {categoryProducts.map((product) => (
                    <ProductCard key={`${category.id}-${product.id}`} product={withSalePricing(product)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
