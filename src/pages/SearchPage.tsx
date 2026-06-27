import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, Camera, ImageUp, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { searchProducts, searchProductsByImage } from '../lib/db';
import type { Product } from '../types';

interface PhotoSearchPayload {
  products: Product[];
  labels?: string[];
  message?: string;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const isPhotoSearch = searchParams.get('photo') === '1';
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [photoSearching, setPhotoSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      setPhotoMessage('');
      setLabels([]);

      if (isPhotoSearch) {
        try {
          const raw = sessionStorage.getItem('photoSearchResults');
          if (raw) {
            const payload = JSON.parse(raw) as PhotoSearchPayload;
            if (!cancelled) {
              setResults(payload.products || []);
              setLabels(payload.labels || []);
              setPhotoMessage(payload.message || 'Photo search results');
            }
            return;
          }
        } catch {
          sessionStorage.removeItem('photoSearchResults');
        }
      }

      setLoading(true);
      try {
        const data = await searchProducts(query.trim());
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [query, isPhotoSearch]);

  const title = useMemo(() => {
    if (isPhotoSearch) return 'Photo Search Results';
    if (query) return <>Results for "<span className="text-orange-500">{query}</span>"</>;
    return 'All Products';
  }, [isPhotoSearch, query]);

  const handleImageSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setPhotoSearching(true);
      setError('');
      const payload = await searchProductsByImage(file);
      sessionStorage.setItem('photoSearchResults', JSON.stringify(payload));
      setResults(payload.products || []);
      setLabels(payload.labels || []);
      setPhotoMessage(payload.message || 'Photo search results');
      window.history.replaceState(null, '', '/search?photo=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo search failed. Please try again.');
    } finally {
      setPhotoSearching(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
          <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">Search Results</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {isPhotoSearch ? <Camera size={20} className="text-orange-500" /> : <Search size={20} className="text-gray-400" />}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">{results.length} product(s) found</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
                {photoSearching ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                Capture/Search Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSearch}
                  className="sr-only"
                  disabled={photoSearching}
                />
              </label>
              <label className="cursor-pointer inline-flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
                <ImageUp size={16} />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSearch}
                  className="sr-only"
                  disabled={photoSearching}
                />
              </label>
            </div>
          </div>

          {photoMessage && (
            <div className="mt-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold">{photoMessage}</p>
              {labels.length > 0 && <p className="mt-1 text-xs text-orange-600">Detected: {labels.slice(0, 8).join(', ')}</p>}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </div>

        {loading || photoSearching ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" />
            Searching products...
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Search size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-700 font-semibold text-lg mb-1">No results found</p>
            <p className="text-gray-400 text-sm mb-6">Try another keyword or upload/capture a product photo.</p>
            <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm">Browse All Products</Link>
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
