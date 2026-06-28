import React, { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { categories } from '../data/categories';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

const cleanLabel = (value?: string | null) => (value || '').trim();
const normalizeText = (value?: string | null) => cleanLabel(value)
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const slugify = (value?: string | null) => normalizeText(value).replace(/\s+/g, '-');

function valuesMatch(a?: string | null, b?: string | null) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left === right || slugify(left) === slugify(right);
}

function categoryMatches(product: any, categorySlug?: string | null, categoryName?: string | null) {
  if (!categorySlug || categorySlug === 'all') return true;
  const productCategory = product.category ?? product.categorySlug ?? product.mainCategory;
  return valuesMatch(productCategory, categorySlug) || valuesMatch(productCategory, categoryName);
}

function subcategoryMatches(product: any, label: string) {
  if (!label) return true;
  const directFields = [
    product.subcategory,
    product.subCategory,
    product.childCategory,
    product.subSubCategory,
  ];
  if (directFields.some((field) => valuesMatch(field, label))) return true;

  // Fallback for older products that only have a name/description but missing subcategory fields.
  const searchableFields = [
    product.name,
    product.brand,
    product.description,
    product.category,
    ...(Array.isArray(product.features) ? product.features : []),
    ...Object.values(product.specifications || {}),
  ];
  const q = normalizeText(label);
  return searchableFields.some((field) => normalizeText(String(field || '')).includes(q));
}

const sortOptions = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Newest First', value: 'newest' },
];

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const selectedSub = cleanLabel(searchParams.get('sub'));
  const selectedChild = cleanLabel(searchParams.get('child'));
  const [sort, setSort] = useState('popular');
  const [maxPrice, setMaxPrice] = useState(200000);
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { products, loading } = useProducts();

  const category = categories.find((c) => c.slug === slug);
  const isAll = slug === 'all';

  const filtered = useMemo(() => {
    let list = products.filter((p) => categoryMatches(p, slug, category?.name));

    if (selectedSub) {
      list = list.filter((p) => subcategoryMatches(p, selectedSub));
    }

    if (selectedChild) {
      list = list.filter((p) => subcategoryMatches(p, selectedChild));
    }

    list = list.filter((p) => Number(p.price ?? 0) <= maxPrice && Number(p.rating ?? 0) >= minRating);
    switch (sort) {
      case 'price-asc': return [...list].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
      case 'price-desc': return [...list].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
      case 'rating': return [...list].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
      case 'newest': return [...list].reverse();
      default: return list;
    }
  }, [slug, category?.name, sort, maxPrice, minRating, products, selectedSub, selectedChild]);

  const categoryName = isAll ? 'All Products' : category?.name ?? slug?.replace(/-/g, ' ');
  const pageTitle = selectedChild || selectedSub || categoryName;

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={200000}
            step={1000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>৳0</span>
            <span className="text-orange-600 font-semibold">৳{maxPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Minimum Rating</h3>
        <div className="space-y-2">
          {[4.5, 4.0, 3.5, 0].map((r) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={minRating === r}
                onChange={() => setMinRating(r)}
                className="accent-orange-500"
              />
              <span className="text-sm text-gray-700">
                {r === 0 ? 'All Ratings' : `${r}+ Stars`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-2">
          <Link
            to="/category/all"
            className={`block text-sm px-2 py-1 rounded-lg transition-colors ${isAll ? 'text-orange-500 font-semibold bg-orange-50' : 'text-gray-600 hover:text-orange-500'}`}
          >
            All Products
          </Link>
          {categories.slice(0, 14).map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`block text-sm px-2 py-1 rounded-lg transition-colors ${cat.slug === slug ? 'text-orange-500 font-semibold bg-orange-50' : 'text-gray-600 hover:text-orange-500'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <button
        onClick={() => { setMaxPrice(200000); setMinRating(0); }}
        className="w-full border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500 text-sm font-medium py-2 rounded-xl transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Category banner */}
      {category && (
        <div className="relative h-32 sm:h-44 overflow-hidden">
          <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30 flex items-center px-6 sm:px-12">
            <div>
              <h1 className="text-white text-2xl sm:text-3xl font-bold">{pageTitle}</h1>
              <p className="text-gray-300 text-sm mt-1">{filtered.length} products available</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
          <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium capitalize">{pageTitle}</span>
        </nav>

        <div className="flex gap-6">
          {/* Sidebar filter — desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-5">Filters</h2>
              <FilterPanel />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{filtered.length}</span> products found
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl hover:border-orange-300 transition-colors"
                >
                  <SlidersHorizontal size={15} />
                  Filters
                </button>

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-medium pl-3 pr-8 py-2 rounded-xl cursor-pointer hover:border-orange-300 focus:outline-none focus:border-orange-400 transition-colors"
                  >
                    {sortOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 text-gray-400">Loading products...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
                <p className="text-gray-400 text-lg mb-2">No products found</p>
                <p className="text-gray-400 text-sm mb-5">No products are saved under {pageTitle} yet, or the selected filters are too strict.</p>
                <button onClick={() => { setMaxPrice(200000); setMinRating(0); }} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setFiltersOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <FilterPanel />
          </div>
        </>
      )}
    </div>
  );
}
