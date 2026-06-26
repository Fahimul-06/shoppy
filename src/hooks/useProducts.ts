import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { fetchProducts } from '../lib/db';
import { products as fallbackProducts } from '../data/products';

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    rating: Number(product.rating ?? 0),
    reviewCount: Number(product.reviewCount ?? 0),
    price: Number(product.price ?? 0),
    originalPrice: product.originalPrice === undefined || product.originalPrice === null ? undefined : Number(product.originalPrice),
    stock: Number(product.stock ?? 0),
    images: product.images?.length ? product.images : [product.image].filter(Boolean),
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchProducts()
      .then((rows) => {
        if (!alive) return;
        setProducts((rows || []).map(normalizeProduct));
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        console.error('Failed to fetch products from API; showing bundled demo products.', err);
        setProducts(fallbackProducts.map(normalizeProduct));
        setError(err instanceof Error ? err.message : 'Failed to load products');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { products, loading, error };
}
